const crypto = require('crypto');
const {
  MATCH_PAYMENT_CONFIG,
  MATCH_PAYMENT_PROVIDERS,
} = require('../../constants/matchPayments');

function assertFetchAvailable() {
  if (typeof fetch !== 'function') {
    const error = new Error('Global fetch no está disponible en esta versión de Node.');
    error.code = 'FETCH_UNAVAILABLE';
    throw error;
  }
}

function buildWebhookUrl() {
  if (!MATCH_PAYMENT_CONFIG.public_base_url) return null;
  return `${MATCH_PAYMENT_CONFIG.public_base_url}${MATCH_PAYMENT_CONFIG.webhook_path}`;
}

function buildBackUrl(status, payment) {
  const base = `${MATCH_PAYMENT_CONFIG.mobile_scheme}://payments/result`;
  return `${base}?status=${encodeURIComponent(status)}&local_payment_id=${encodeURIComponent(payment.id)}`;
}

function normalizeUnitPrice(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

async function mercadoPagoRequest(path, { method = 'GET', body = null, idempotencyKey = null } = {}) {
  const accessToken = String(process.env.MP_ACCESS_TOKEN || '').trim();
  if (!accessToken) {
    const error = new Error('MP_ACCESS_TOKEN no está configurado.');
    error.code = 'MP_ACCESS_TOKEN_MISSING';
    throw error;
  }

  assertFetchAvailable();

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['X-Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Mercado Pago respondio ${response.status}`);
    error.code = 'MERCADOPAGO_REQUEST_FAILED';
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

async function createMercadoPagoPreference({ payment, match, slot, payer }) {
  const expirationDate = payment.expires_at instanceof Date
    ? payment.expires_at.toISOString()
    : null;
  const unitPrice = normalizeUnitPrice(payment.total_amount);

  if (!(unitPrice > 0)) {
    const error = new Error('La sede no tiene un precio valido para iniciar el cobro.');
    error.status = 400;
    error.publicMessage = error.message;
    error.code = 'INVALID_UNIT_PRICE';
    throw error;
  }

  const body = {
    items: [
      {
        id: `match-payment-${payment.id}`,
        title: payment.role === 'creator' ? 'Creación de partido Padex' : 'Ingreso a partido Padex',
        description: `Partido ${match.id} - ${slot.date} ${slot.time}`,
        quantity: 1,
        currency_id: payment.currency,
        unit_price: unitPrice,
      },
    ],
    payer: payer?.email
      ? {
          email: payer.email,
          name: payer.name,
        }
      : undefined,
    external_reference: payment.external_reference,
    notification_url: buildWebhookUrl() || undefined,
    back_urls: {
      success: buildBackUrl('success', payment),
      failure: buildBackUrl('failure', payment),
      pending: buildBackUrl('pending', payment),
    },
    auto_return: 'approved',
    binary_mode: true,
    expires: Boolean(expirationDate),
    expiration_date_to: expirationDate || undefined,
    metadata: {
      match_id: match.id,
      payment_id: payment.id,
      slot_id: slot.id,
      user_id: payment.user_id,
      role: payment.role,
    },
  };

  const preference = await mercadoPagoRequest('/checkout/preferences', {
    method: 'POST',
    body,
    idempotencyKey: payment.external_reference || `padex-preference-${payment.id}`,
  });

  return {
    provider_preference_id: preference.id,
    checkout_url: preference.init_point || null,
    sandbox_checkout_url: preference.sandbox_init_point || null,
    provider_payload: preference,
  };
}

async function createMockPreference({ payment }) {
  return {
    provider_preference_id: `mock_pref_${payment.id}`,
    checkout_url: null,
    sandbox_checkout_url: null,
    provider_payload: {
      mock: true,
      mock_token: crypto.randomUUID(),
      payment_id: payment.id,
    },
  };
}

async function createCheckoutSession(context) {
  if (MATCH_PAYMENT_CONFIG.provider === MATCH_PAYMENT_PROVIDERS.MERCADOPAGO) {
    return createMercadoPagoPreference(context);
  }

  return createMockPreference(context);
}

async function fetchMercadoPagoPayment(providerPaymentId) {
  return mercadoPagoRequest(`/v1/payments/${providerPaymentId}`);
}

async function refundMercadoPagoPayment(providerPaymentId) {
  return mercadoPagoRequest(`/v1/payments/${providerPaymentId}/refunds`, {
    method: 'POST',
    body: {},
    idempotencyKey: `padex-refund-${providerPaymentId}`,
  });
}

async function fetchProviderPayment(providerPaymentId) {
  if (MATCH_PAYMENT_CONFIG.provider !== MATCH_PAYMENT_PROVIDERS.MERCADOPAGO) {
    return null;
  }

  return fetchMercadoPagoPayment(providerPaymentId);
}

async function refundProviderPayment(payment) {
  if (MATCH_PAYMENT_CONFIG.provider !== MATCH_PAYMENT_PROVIDERS.MERCADOPAGO) {
    return {
      mock: true,
      refunded: true,
      payment_id: payment.id,
    };
  }

  if (!payment.provider_payment_id) {
    const error = new Error('No hay provider_payment_id para generar el reembolso.');
    error.code = 'MISSING_PROVIDER_PAYMENT_ID';
    throw error;
  }

  return refundMercadoPagoPayment(payment.provider_payment_id);
}

module.exports = {
  createCheckoutSession,
  fetchProviderPayment,
  refundProviderPayment,
};
