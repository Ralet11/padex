import axios from 'axios';

const DEFAULT_API_ORIGIN = 'https://apidev.insiderbookings.com';
export const AUTH_STORAGE_KEY = 'padex_user';
const JWT_EXPIRY_SKEW_MS = 30_000;

let unauthorizedHandler = null;

function normalizeOrigin(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === '/') return '';

  return trimmed.replace(/\/+$/, '');
}

export const API_ORIGIN = normalizeOrigin(import.meta.env.VITE_API_URL) ?? DEFAULT_API_ORIGIN;
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
export const ROUTER_MODE = import.meta.env.VITE_ROUTER_MODE === 'browser' ? 'browser' : 'hash';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

function decodeBase64UrlSegment(segment) {
  if (typeof segment !== 'string' || !segment) return null;

  try {
    const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded =
      typeof atob === 'function'
        ? atob(padded)
        : typeof Buffer !== 'undefined'
        ? Buffer.from(padded, 'base64').toString('binary')
        : null;
    if (!decoded) return null;
    const bytes = Uint8Array.from(decoded, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token) {
  if (typeof token !== 'string') return null;

  const [, payloadSegment] = token.split('.');
  if (!payloadSegment) return null;

  const decoded = decodeBase64UrlSegment(payloadSegment);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function isJwtExpired(token, options = {}) {
  const payload = decodeJwtPayload(token);
  const skewMs = options.skewMs ?? JWT_EXPIRY_SKEW_MS;
  const expSeconds = Number(payload?.exp);

  if (!Number.isFinite(expSeconds)) return false;

  return expSeconds * 1000 <= Date.now() + skewMs;
}

export function readStoredSession(storage = window.localStorage) {
  try {
    const saved = storage?.getItem?.(AUTH_STORAGE_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || typeof parsed.token !== 'string' || !parsed.token.trim()) {
      storage?.removeItem?.(AUTH_STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    storage?.removeItem?.(AUTH_STORAGE_KEY);
    return null;
  }
}

export function persistSession(session, storage = window.localStorage) {
  if (!session) {
    storage?.removeItem?.(AUTH_STORAGE_KEY);
    return;
  }

  storage?.setItem?.(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession(storage = window.localStorage) {
  storage?.removeItem?.(AUTH_STORAGE_KEY);
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const requestHeaders = error?.config?.headers || {};
    const hadAuthorizationHeader = Boolean(
      requestHeaders.Authorization ||
        requestHeaders.authorization ||
        api.defaults.headers.common.Authorization
    );
    const isPublicAuthAttempt =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/social/');

    if (status === 401 && hadAuthorizationHeader && !isPublicAuthAttempt) {
      unauthorizedHandler?.(error);
    }

    return Promise.reject(error);
  }
);

export function resolveAssetUrl(value) {
  if (!value) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalizedPath}` : normalizedPath;
}
