import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const DEFAULT_API_URL = 'http://192.168.1.36:3000';
const isDev = typeof __DEV__ !== 'undefined' && __DEV__;

function normalizeBaseUrl(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  return trimmed.replace(/\/+$/, '');
}

const configApiUrl = normalizeBaseUrl(Constants.expoConfig?.extra?.apiUrl);

export const BASE_URL = normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) || configApiUrl || DEFAULT_API_URL;
export const API_URL = `${BASE_URL}/api`;

export function resolveAssetUrl(uri) {
  if (!uri) return null;
  if (/^(?:[a-z]+:)?\/\//i.test(uri) || uri.startsWith('data:') || uri.startsWith('blob:')) {
    return uri;
  }

  const normalizedPath = uri.startsWith('/') ? uri : `/${uri}`;
  return `${BASE_URL}${normalizedPath}`;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (isDev) {
    console.log('[api] request', {
      method: config.method,
      url: `${config.baseURL || ''}${config.url || ''}`,
      hasToken: Boolean(token),
    });
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    if (isDev) {
      console.log('[api] response', {
        method: res.config?.method,
        url: `${res.config?.baseURL || ''}${res.config?.url || ''}`,
        status: res.status,
      });
    }
    return res;
  },
  (err) => {
    if (isDev) {
      console.warn('[api] error', {
        method: err.config?.method,
        url: `${err.config?.baseURL || ''}${err.config?.url || ''}`,
        status: err.response?.status || null,
        error: err.response?.data?.error || err.message,
        requestId: err.response?.headers?.['x-request-id'] || null,
      });
    }

    const msg = err.response?.data?.error || err.message || 'Error de red';
    return Promise.reject(new Error(msg));
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const profileAPI = {
  get: (id) => api.get(`/profile/${id}`),
  update: (data) => api.put('/profile', data),
  uploadAvatar: (formData) => api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

export const courtsAPI = {
  list: () => api.get('/courts'),
  venues: (params = {}) => api.get('/courts/venues', { params }),
  venueSlots: (id, date, filters = {}) => api.get(`/courts/venues/${id}/slots`, {
    params: {
      ...(date ? { date } : {}),
      ...filters,
    }
  }),
  venueAvailabilitySummary: (id, from, to, filters = {}) => api.get(`/courts/venues/${id}/availability-summary`, {
    params: {
      from,
      to,
      ...filters,
    }
  }),
  get: (id) => api.get(`/courts/${id}`),
  slots: (id, date) => api.get(`/courts/${id}/slots`, { params: date ? { date } : {} }),
};

export const matchesAPI = {
  list: (params) => api.get('/matches', { params }),
  my: () => api.get('/matches/my'),
  get: (id) => api.get(`/matches/${id}`),
  create: (data) => api.post('/matches', data),
  join: (id) => api.post(`/matches/${id}/join`),
  leave: (id) => api.delete(`/matches/${id}/leave`),
  complete: (id, data = {}) => api.put(`/matches/${id}/complete`, data),
};

export const socialAPI = {
  players: (params) => api.get('/social/players', { params }),
  connect: (addressee_id) => api.post('/social/connect', { addressee_id }),
  respond: (id, action) => api.put(`/social/connect/${id}`, { action }),
  disconnect: (id) => api.delete(`/social/connect/${id}`),
  connections: () => api.get('/social/connections'),
  pending: () => api.get('/social/pending'),
};

export const messagesAPI = {
  list: (connectionId) => api.get(`/messages/${connectionId}`),
  send: (data) => api.post('/messages', data),
};

export const ratingsAPI = {
  rate: (data) => api.post('/ratings', data),
  get: (userId) => api.get(`/ratings/${userId}`),
};

export default api;
