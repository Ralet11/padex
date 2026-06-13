const crypto = require('crypto');
const { MATCH_PAYMENT_CONFIG, MATCH_PAYMENT_PROVIDERS } = require('../../constants/matchPayments');

function parseSignatureHeader(signatureHeader) {
  const parts = String(signatureHeader || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  const parsed = {};
  parts.forEach((part) => {
    const [key, value] = part.split('=');
    if (key && value) parsed[key.trim()] = value.trim();
  });

  return {
    ts: parsed.ts || null,
    v1: parsed.v1 || null,
  };
}

function buildManifest({ dataId, requestId, ts }) {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

function shouldValidateWebhookSignature() {
  return MATCH_PAYMENT_CONFIG.provider === MATCH_PAYMENT_PROVIDERS.MERCADOPAGO;
}

function validateMercadoPagoWebhookSignature(req) {
  if (!shouldValidateWebhookSignature()) return true;

  const secret = String(process.env.MP_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    const error = new Error('MP_WEBHOOK_SECRET no está configurado.');
    error.status = 500;
    error.code = 'MP_WEBHOOK_SECRET_MISSING';
    throw error;
  }

  const signatureHeader = req.headers['x-signature'];
  const requestId = req.headers['x-request-id'];
  const dataId = req.query['data.id'] || req.body?.data?.id;

  const { ts, v1 } = parseSignatureHeader(signatureHeader);
  if (!ts || !v1 || !requestId || !dataId) {
    const error = new Error('Webhook de Mercado Pago sin headers de validacion completos.');
    error.status = 401;
    error.code = 'MP_WEBHOOK_SIGNATURE_INVALID';
    throw error;
  }

  const manifest = buildManifest({
    dataId: String(dataId),
    requestId: String(requestId),
    ts: String(ts),
  });

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  const matches = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf8'),
    Buffer.from(String(v1), 'utf8')
  );

  if (!matches) {
    const error = new Error('Firma de webhook Mercado Pago invalida.');
    error.status = 401;
    error.code = 'MP_WEBHOOK_SIGNATURE_INVALID';
    throw error;
  }

  return true;
}

module.exports = {
  validateMercadoPagoWebhookSignature,
};
