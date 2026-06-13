const SEND_WINDOW_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 45 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MOCK_CODE = '123456';
const MOCK_TTL_MS = 5 * 60 * 1000;

const sendAttempts = new Map();
const mockVerifications = new Map();

class PhoneAuthError extends Error {
  constructor(status, message, code = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizePhoneNumber(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;

  let normalizedDigits = digits;
  if (!hasPlus) {
    if (digits.startsWith('00')) {
      normalizedDigits = digits.slice(2);
    } else if (digits.startsWith('549')) {
      normalizedDigits = digits;
    } else if (digits.startsWith('54')) {
      normalizedDigits = `549${digits.slice(2)}`;
    } else {
      normalizedDigits = `549${digits.replace(/^0+/, '')}`;
    }
  }

  if (normalizedDigits.length < 10 || normalizedDigits.length > 15) {
    return null;
  }

  return `+${normalizedDigits}`;
}

function getClientIp(requestIp) {
  return String(requestIp || '').trim() || 'unknown';
}

function cleanupAttemptBucket(bucket, now) {
  bucket.timestamps = bucket.timestamps.filter((timestamp) => now - timestamp < SEND_WINDOW_MS);
}

function enforceSendRateLimit(phone, requestIp) {
  const now = Date.now();
  const key = `${phone}:${getClientIp(requestIp)}`;
  const bucket = sendAttempts.get(key) || { timestamps: [], lastSentAt: 0 };

  cleanupAttemptBucket(bucket, now);

  if (bucket.lastSentAt && now - bucket.lastSentAt < SEND_COOLDOWN_MS) {
    const waitSeconds = Math.ceil((SEND_COOLDOWN_MS - (now - bucket.lastSentAt)) / 1000);
    throw new PhoneAuthError(
      429,
      `Espera ${waitSeconds}s antes de pedir un nuevo codigo`,
      'phone_code_cooldown'
    );
  }

  if (bucket.timestamps.length >= MAX_SENDS_PER_WINDOW) {
    throw new PhoneAuthError(
      429,
      'Llegaste al limite de codigos enviados. Intenta de nuevo en unos minutos',
      'phone_code_rate_limited'
    );
  }

  bucket.timestamps.push(now);
  bucket.lastSentAt = now;
  sendAttempts.set(key, bucket);
}

function isPhoneAuthMockEnabled() {
  return String(process.env.PHONE_AUTH_MOCK || '').trim() === 'true';
}

function getTwilioVerifyConfig() {
  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const serviceSid = String(process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();

  if (!accountSid || !authToken || !serviceSid) {
    return null;
  }

  return { accountSid, authToken, serviceSid };
}

async function twilioVerifyRequest(path, params) {
  const config = getTwilioVerifyConfig();
  if (!config) {
    throw new PhoneAuthError(
      503,
      'La verificacion por telefono no esta configurada en este momento',
      'phone_auth_not_configured'
    );
  }

  const response = await fetch(`https://verify.twilio.com/v2/Services/${config.serviceSid}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams(params),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload?.message || 'No pudimos enviar el codigo en este momento';
    throw new PhoneAuthError(response.status || 502, detail, payload?.code || 'twilio_verify_error');
  }

  return payload;
}

async function sendPhoneVerification({ phone, requestIp, channel = 'sms' }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    throw new PhoneAuthError(400, 'Ingresa un telefono valido con codigo de pais', 'invalid_phone');
  }

  enforceSendRateLimit(normalizedPhone, requestIp);

  if (isPhoneAuthMockEnabled()) {
    mockVerifications.set(normalizedPhone, {
      code: MOCK_CODE,
      expiresAt: Date.now() + MOCK_TTL_MS,
    });

    console.log('[phone-auth] mock verification created', {
      phone: normalizedPhone,
      code: MOCK_CODE,
    });

    return {
      sid: 'mock_verification',
      to: normalizedPhone,
      channel,
      status: 'pending',
      isMock: true,
    };
  }

  return twilioVerifyRequest('/Verifications', {
    To: normalizedPhone,
    Channel: channel,
  });
}

async function checkPhoneVerification({ phone, code }) {
  const normalizedPhone = normalizePhoneNumber(phone);
  if (!normalizedPhone) {
    throw new PhoneAuthError(400, 'Ingresa un telefono valido con codigo de pais', 'invalid_phone');
  }

  const normalizedCode = String(code || '').trim();
  if (!/^\d{4,8}$/.test(normalizedCode)) {
    throw new PhoneAuthError(400, 'Ingresa un codigo valido', 'invalid_code');
  }

  if (isPhoneAuthMockEnabled()) {
    const verification = mockVerifications.get(normalizedPhone);
    if (!verification || verification.expiresAt < Date.now()) {
      mockVerifications.delete(normalizedPhone);
      throw new PhoneAuthError(400, 'El codigo expiro. Pide uno nuevo', 'phone_code_expired');
    }

    if (verification.code !== normalizedCode) {
      throw new PhoneAuthError(400, 'El codigo es incorrecto', 'phone_code_invalid');
    }

    mockVerifications.delete(normalizedPhone);
    return {
      sid: 'mock_verification_check',
      to: normalizedPhone,
      status: 'approved',
      valid: true,
      isMock: true,
    };
  }

  return twilioVerifyRequest('/VerificationCheck', {
    To: normalizedPhone,
    Code: normalizedCode,
  });
}

module.exports = {
  PhoneAuthError,
  normalizePhoneNumber,
  sendPhoneVerification,
  checkPhoneVerification,
};
