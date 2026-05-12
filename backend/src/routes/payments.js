const express = require('express');
const { MatchPayment, Match, Slot, Court } = require('../models');
const auth = require('../middleware/auth');
const { emitVenueAvailabilityUpdate } = require('../services/realtime');
const { validateMercadoPagoWebhookSignature } = require('../services/payments/webhookSignature');
const {
  MATCH_PAYMENT_CONFIG,
  approvePaymentIntent,
  cancelPaymentIntent,
  syncMercadoPagoPayment,
} = require('../services/payments/matchPayments');

const router = express.Router();

async function emitPaymentSlotUpdate(slotId, reason) {
  const slot = await Slot.findByPk(slotId, {
    include: [{ model: Court, attributes: ['venue_id'] }],
  });

  if (!slot?.Court?.venue_id) return;

  emitVenueAvailabilityUpdate({
    venueId: slot.Court.venue_id,
    date: slot.date,
    reason,
  });
}

function serializePayment(payment) {
  return {
    id: payment.id,
    match_id: payment.match_id,
    slot_id: payment.slot_id,
    user_id: payment.user_id,
    provider: payment.provider,
    role: payment.role,
    status: payment.status,
    position_index: payment.position_index,
    base_amount: payment.base_amount,
    extra_amount: payment.extra_amount,
    total_amount: payment.total_amount,
    currency: payment.currency,
    checkout_url: payment.checkout_url,
    sandbox_checkout_url: payment.sandbox_checkout_url,
    expires_at: payment.expires_at,
    approved_at: payment.approved_at,
    refunded_at: payment.refunded_at,
    failure_reason: payment.failure_reason,
    refund_reason: payment.refund_reason,
  };
}

function isTerminalPaymentStatus(status) {
  return [
    'approved',
    'rejected',
    'cancelled',
    'expired',
    'refund_pending',
    'refunded',
  ].includes(status);
}

router.post('/mercadopago/webhook', async (req, res) => {
  try {
    const notificationType = req.query.type || req.body?.type;
    const paymentId = req.query['data.id'] || req.body?.data?.id;

    if (notificationType !== 'payment' || !paymentId) {
      return res.status(200).json({ received: true, ignored: true });
    }

    validateMercadoPagoWebhookSignature(req);
    const payment = await syncMercadoPagoPayment(String(paymentId));
    await emitPaymentSlotUpdate(payment.slot_id, 'payment_webhook_processed');
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[payments:webhook]', err);
    return res.status(err.status || 200).json({ received: true, error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const payment = await MatchPayment.findByPk(req.params.id, {
      include: [{ model: Match, as: 'Match', attributes: ['id', 'creator_id'] }],
    });

    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.user_id !== req.user.id && payment.Match?.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    return res.json({ payment: serializePayment(payment) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error consultando el pago' });
  }
});

router.post('/:id/sync', auth, async (req, res) => {
  try {
    const payment = await MatchPayment.findByPk(req.params.id, {
      include: [{ model: Match, as: 'Match', attributes: ['id', 'creator_id'] }],
    });

    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.user_id !== req.user.id && payment.Match?.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    if (payment.provider !== 'mercadopago') {
      return res.json({ payment: serializePayment(payment), synced: false });
    }

    const providerPaymentId = String(
      req.body?.providerPaymentId
      || payment.provider_payment_id
      || ''
    ).trim();

    if (!providerPaymentId) {
      if (isTerminalPaymentStatus(payment.status)) {
        return res.json({ payment: serializePayment(payment), synced: false });
      }

      return res.status(400).json({ error: 'providerPaymentId requerido para sincronizar el pago' });
    }

    const syncedPayment = await syncMercadoPagoPayment(providerPaymentId);
    if (Number(syncedPayment.id) !== Number(payment.id)) {
      return res.status(409).json({ error: 'El pago remoto no coincide con el pago solicitado' });
    }

    await emitPaymentSlotUpdate(syncedPayment.slot_id, 'payment_client_synced');
    return res.json({ payment: serializePayment(syncedPayment), synced: true });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.publicMessage || err.message || 'Error sincronizando el pago' });
  }
});

router.post('/:id/mock-approve', auth, async (req, res) => {
  try {
    if (!MATCH_PAYMENT_CONFIG.allow_mock_confirm) {
      return res.status(403).json({ error: 'La aprobacion mock esta deshabilitada' });
    }

    const payment = await MatchPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.user_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });

    const approvedPayment = await approvePaymentIntent(payment.id, {
      providerPaymentId: `mock_payment_${payment.id}`,
      providerPayload: { mock: true, status: 'approved', payment_id: payment.id },
    });
    await emitPaymentSlotUpdate(approvedPayment.slot_id, 'payment_mock_approved');

    return res.json({ payment: serializePayment(approvedPayment) });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.publicMessage || err.message || 'Error aprobando el pago mock' });
  }
});

router.post('/:id/mock-reject', auth, async (req, res) => {
  try {
    if (!MATCH_PAYMENT_CONFIG.allow_mock_confirm) {
      return res.status(403).json({ error: 'La aprobacion mock esta deshabilitada' });
    }

    const payment = await MatchPayment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Pago no encontrado' });
    if (payment.user_id !== req.user.id) return res.status(403).json({ error: 'No autorizado' });

    const cancelledPayment = await cancelPaymentIntent(payment.id, {
      reason: 'mock_rejected_payment',
      failureReason: 'mock_rejected_payment',
    });
    await emitPaymentSlotUpdate(cancelledPayment.slot_id, 'payment_mock_rejected');

    return res.json({ payment: serializePayment(cancelledPayment) });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.publicMessage || err.message || 'Error rechazando el pago mock' });
  }
});

module.exports = router;
