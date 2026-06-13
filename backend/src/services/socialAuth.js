const { createPublicKey, randomUUID } = require('crypto');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { starsFromSelfCategory, categoryFromStars } = require('./elo');

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;

const jwksCache = new Map();

class SocialAuthError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function normalizeEmail(value) {
  if (typeof value !== 'string') return null;

  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

function parseCsv(value) {
  if (typeof value !== 'string') return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function deriveAllowedAudiences(provider, decodedAudience) {
  const envValue =
    provider === 'google' ? process.env.GOOGLE_AUTH_CLIENT_IDS : process.env.APPLE_AUTH_CLIENT_IDS;
  const configuredAudiences = parseCsv(envValue);

  if (configuredAudiences.length > 0) {
    return configuredAudiences;
  }

  if (process.env.NODE_ENV !== 'production' && decodedAudience) {
    console.warn(`[social-auth] ${provider} using development audience fallback`, {
      audience: decodedAudience,
    });
    return [decodedAudience];
  }

  throw new SocialAuthError(
    503,
    `La autenticación con ${provider === 'google' ? 'Google' : 'Apple'} no está configurada`
  );
}

async function fetchJwks(jwksUrl, { forceRefresh = false } = {}) {
  const cached = jwksCache.get(jwksUrl);
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.keys;
  }

  const response = await fetch(jwksUrl, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new SocialAuthError(502, 'No pudimos validar el proveedor social en este momento');
  }

  const payload = await response.json();
  if (!Array.isArray(payload?.keys)) {
    throw new SocialAuthError(502, 'No pudimos validar el proveedor social en este momento');
  }

  jwksCache.set(jwksUrl, {
    keys: payload.keys,
    expiresAt: Date.now() + JWKS_CACHE_TTL_MS,
  });

  return payload.keys;
}

async function verifyJwtWithJwks(idToken, { provider, jwksUrl, issuers }) {
  if (!idToken) {
    throw new SocialAuthError(
      400,
      `Falta el token de ${provider === 'google' ? 'Google' : 'Apple'}`
    );
  }

  const decoded = jwt.decode(idToken, { complete: true });
  const tokenAudience = decoded?.payload?.aud;
  const audiences = deriveAllowedAudiences(provider, tokenAudience);
  const tokenKeyId = decoded?.header?.kid;

  if (!tokenKeyId) {
    throw new SocialAuthError(400, 'No pudimos validar la identidad proporcionada');
  }

  async function resolveKey(forceRefresh = false) {
    const keys = await fetchJwks(jwksUrl, { forceRefresh });
    return keys.find((key) => key.kid === tokenKeyId && key.kty === 'RSA') || null;
  }

  try {
    let jwk = await resolveKey();
    if (!jwk) {
      jwk = await resolveKey(true);
    }

    if (!jwk) {
      throw new SocialAuthError(401, 'No pudimos validar la identidad proporcionada');
    }

    const publicKey = createPublicKey({ key: jwk, format: 'jwk' });

    return jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      audience: audiences,
      issuer: issuers,
    });
  } catch (error) {
    if (error instanceof SocialAuthError) {
      throw error;
    }

    if (error?.name === 'TokenExpiredError') {
      throw new SocialAuthError(401, 'La sesión con el proveedor expiró. Inténtalo de nuevo');
    }

    console.error(`[social-auth] ${provider} token verification failed`);
    console.error(error);
    throw new SocialAuthError(401, 'No pudimos validar la identidad proporcionada');
  }
}

function joinNameParts(fullName) {
  if (!fullName) return null;

  if (typeof fullName === 'string') {
    const normalized = fullName.trim();
    return normalized || null;
  }

  const parts = [
    fullName.givenName,
    fullName.middleName,
    fullName.familyName,
  ]
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean);

  return parts.length ? parts.join(' ') : null;
}

function deriveName(email, preferredName) {
  if (preferredName) return preferredName;
  if (!email) return 'Jugador Padex';

  const seed = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
  if (!seed) return 'Jugador Padex';

  return seed.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getProviderField(provider) {
  return provider === 'google' ? 'google_sub' : 'apple_sub';
}

function issueAuthToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

async function findOrCreateSocialUser({ provider, providerUserId, email, name, avatar }) {
  const providerField = getProviderField(provider);
  const normalizedEmail = normalizeEmail(email);
  let user = await User.findOne({ where: { [providerField]: providerUserId } });

  if (!user && normalizedEmail) {
    user = await User.findOne({ where: { email: normalizedEmail } });
  }

  if (user) {
    if (user[providerField] && user[providerField] !== providerUserId) {
      throw new SocialAuthError(409, 'No pudimos vincular esta cuenta social');
    }

    const nextValues = {};

    if (!user[providerField]) {
      nextValues[providerField] = providerUserId;
    }

    if (provider === 'google' && avatar && !user.avatar) {
      nextValues.avatar = avatar;
    }

    if ((!user.name || !user.name.trim()) && name) {
      nextValues.name = name;
    }

    if (Object.keys(nextValues).length > 0) {
      await user.update(nextValues);
    }

    return user;
  }

  if (!normalizedEmail) {
    throw new SocialAuthError(
      400,
      'No pudimos obtener un email valido desde el proveedor social'
    );
  }

  const selfCategory = 'principiante';
  const stars = starsFromSelfCategory(selfCategory);
  const categoryTier = categoryFromStars(stars);

  return User.create({
    email: normalizedEmail,
    password: randomUUID(),
    name: deriveName(normalizedEmail, name),
    avatar: avatar || null,
    self_category: selfCategory,
    category: selfCategory,
    stars,
    category_tier: categoryTier,
    [providerField]: providerUserId,
  });
}

async function verifyGoogleIdentityToken(idToken) {
  const payload = await verifyJwtWithJwks(idToken, {
    provider: 'google',
    jwksUrl: GOOGLE_JWKS_URL,
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
  });

  if (!payload?.sub) {
    throw new SocialAuthError(401, 'No pudimos validar tu cuenta de Google');
  }

  if (!payload?.email || payload.email_verified === false) {
    throw new SocialAuthError(400, 'Google no devolvio un email verificado');
  }

  return {
    provider: 'google',
    providerUserId: payload.sub,
    email: payload.email,
    name: payload.name || null,
    avatar: payload.picture || null,
  };
}

async function verifyAppleIdentityToken({ identityToken, email, fullName }) {
  const payload = await verifyJwtWithJwks(identityToken, {
    provider: 'apple',
    jwksUrl: APPLE_JWKS_URL,
    issuers: ['https://appleid.apple.com'],
  });

  if (!payload?.sub) {
    throw new SocialAuthError(401, 'No pudimos validar tu cuenta de Apple');
  }

  return {
    provider: 'apple',
    providerUserId: payload.sub,
    email: payload.email || email || null,
    name: joinNameParts(fullName),
    avatar: null,
  };
}

module.exports = {
  SocialAuthError,
  issueAuthToken,
  findOrCreateSocialUser,
  verifyGoogleIdentityToken,
  verifyAppleIdentityToken,
};
