import axios from 'axios';

const DEFAULT_API_ORIGIN = 'https://apidev.insiderbookings.com';

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

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
}

export function resolveAssetUrl(value) {
  if (!value) return '';
  if (/^(?:[a-z]+:)?\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value;
  }

  const normalizedPath = value.startsWith('/') ? value : `/${value}`;
  return API_ORIGIN ? `${API_ORIGIN}${normalizedPath}` : normalizedPath;
}
