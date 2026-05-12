import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { paymentsAPI } from './api';

const FINAL_PAYMENT_STATUSES = new Set([
  'approved',
  'rejected',
  'cancelled',
  'expired',
  'refund_pending',
  'refunded',
]);

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function getReturnUrl() {
  const configuredScheme = String(Constants.expoConfig?.scheme || 'padex').trim();
  const scheme = configuredScheme || 'padex';
  return `${scheme}://payments/result`;
}

function getCheckoutUrl(payment) {
  return payment?.checkout_url || payment?.sandbox_checkout_url || null;
}

function parseReturnParam(url, paramName) {
  if (!url) return null;

  try {
    const query = String(url).split('?')[1] || '';
    const params = new URLSearchParams(query);
    return params.get(paramName);
  } catch {
    return null;
  }
}

async function syncPaymentFromCheckoutReturn(localPaymentId, providerPaymentId) {
  if (!providerPaymentId) return null;

  const response = await paymentsAPI.sync(localPaymentId, {
    providerPaymentId,
  });
  return response?.data?.payment || null;
}

async function pollPaymentUntilFinal(paymentId, { timeoutMs, intervalMs }) {
  const startedAt = Date.now();
  let latestPayment = null;

  while ((Date.now() - startedAt) <= timeoutMs) {
    const response = await paymentsAPI.get(paymentId);
    latestPayment = response?.data?.payment || null;

    if (FINAL_PAYMENT_STATUSES.has(latestPayment?.status)) {
      return latestPayment;
    }

    await wait(intervalMs);
  }

  return latestPayment;
}

export function isMatchPaymentIntentRequired(error) {
  if (!error) return false;
  if (error.code === 'PAYMENT_INTENT_REQUIRED') return true;

  const message = String(error.message || '').toLowerCase();
  return error.status === 409 && message.includes('payment-intent');
}

export function getMatchPaymentOutcomeMessage(status) {
  switch (status) {
    case 'approved':
      return null;
    case 'pending':
      return 'Estamos confirmando tu pago. Volve a intentar en unos segundos.';
    case 'abandoned':
      return 'El pago quedo pendiente o fue cancelado antes de confirmarse.';
    case 'rejected':
      return 'El pago fue rechazado.';
    case 'cancelled':
      return 'El pago fue cancelado.';
    case 'expired':
      return 'La sesion de pago vencio.';
    case 'refund_pending':
      return 'El pago se recibio, pero el cupo ya no estaba disponible. Se esta gestionando el reembolso.';
    case 'refunded':
      return 'El pago fue reembolsado porque el cupo ya no estaba disponible.';
    default:
      return 'No se pudo confirmar el resultado del pago.';
  }
}

export async function startMatchPaymentFlow(createIntent, options = {}) {
  const response = await createIntent();
  const payment = response?.data?.payment || null;
  const initialMatchId = response?.data?.match?.id || null;

  if (!payment?.id) {
    throw new Error('No se pudo iniciar el pago del partido.');
  }

  const checkoutUrl = getCheckoutUrl(payment);
  if (!checkoutUrl) {
    if (payment.provider === 'mock') {
      const approvalResponse = await paymentsAPI.mockApprove(payment.id);
      const approvedPayment = approvalResponse?.data?.payment || payment;
      return {
        status: approvedPayment?.status || 'approved',
        payment: approvedPayment,
        matchId: approvedPayment?.match_id || initialMatchId,
      };
    }

    throw new Error('No se recibio una URL de pago para continuar.');
  }

  const browserResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, getReturnUrl());
  const returnedLocalPaymentId = Number(parseReturnParam(browserResult?.url, 'local_payment_id')) || payment.id;
  const returnedProviderPaymentId = parseReturnParam(browserResult?.url, 'payment_id')
    || parseReturnParam(browserResult?.url, 'collection_id')
    || null;

  let syncedPayment = null;
  if (returnedProviderPaymentId) {
    try {
      syncedPayment = await syncPaymentFromCheckoutReturn(returnedLocalPaymentId, returnedProviderPaymentId);
    } catch (error) {
      console.warn('[matchPayments] no se pudo sincronizar el pago al volver del checkout', error?.message || error);
    }
  }

  const latestPayment = FINAL_PAYMENT_STATUSES.has(syncedPayment?.status)
    ? syncedPayment
    : await pollPaymentUntilFinal(returnedLocalPaymentId, {
      timeoutMs: browserResult?.type === 'success'
        ? (options.successTimeoutMs || 30000)
        : (options.abortTimeoutMs || 2500),
      intervalMs: options.intervalMs || 1500,
    });

  const resolvedPayment = latestPayment || payment;
  const resolvedStatus = resolvedPayment?.status || 'pending';

  if (resolvedStatus === 'approved') {
    return {
      status: 'approved',
      payment: resolvedPayment,
      matchId: resolvedPayment?.match_id || initialMatchId,
    };
  }

  if (FINAL_PAYMENT_STATUSES.has(resolvedStatus)) {
    return {
      status: resolvedStatus,
      payment: resolvedPayment,
      matchId: resolvedPayment?.match_id || initialMatchId,
    };
  }

  return {
    status: browserResult?.type === 'success' ? 'pending' : 'abandoned',
    payment: resolvedPayment,
    matchId: resolvedPayment?.match_id || initialMatchId,
  };
}
