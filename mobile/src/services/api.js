import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ⚙️ Cambia esta IP por la de tu computadora en red local
// Si usas emulador Android: http://10.0.2.2:3000
// Si usas dispositivo físico: http://TU_IP_LOCAL:3000
// Si usas Expo Go en la misma red: http://TU_IP_LOCAL:3000
export const BASE_URL = 'http://192.168.1.36:3000';
export const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Interceptor: agrega token automáticamente
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Interceptor: manejo de errores
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Error de red';
    return Promise.reject(new Error(msg));
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Profile
export const profileAPI = {
  get: (id) => api.get(`/profile/${id}`),
  update: (data) => api.put('/profile', data),
  uploadAvatar: (formData) => api.post('/profile/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Courts
export const courtsAPI = {
  list: () => api.get('/courts'),
  get: (id) => api.get(`/courts/${id}`),
  slots: (id, date) => api.get(`/courts/${id}/slots`, { params: date ? { date } : {} }),
};

// Matches
export const matchesAPI = {
  list: (params) => api.get('/matches', { params }),
  my: () => api.get('/matches/my'),
  get: (id) => api.get(`/matches/${id}`),
  create: (data) => api.post('/matches', data),
  join: (id) => api.post(`/matches/${id}/join`),
  leave: (id) => api.delete(`/matches/${id}/leave`),
  complete: (id) => api.put(`/matches/${id}/complete`),
};

// Social
export const socialAPI = {
  players: (params) => api.get('/social/players', { params }),
  connect: (addressee_id) => api.post('/social/connect', { addressee_id }),
  respond: (id, action) => api.put(`/social/connect/${id}`, { action }),
  disconnect: (id) => api.delete(`/social/connect/${id}`),
  connections: () => api.get('/social/connections'),
  pending: () => api.get('/social/pending'),
};

// Messages
export const messagesAPI = {
  list: (connectionId) => api.get(`/messages/${connectionId}`),
  send: (data) => api.post('/messages', data),
};

// Ratings
export const ratingsAPI = {
  rate: (data) => api.post('/ratings', data),
  get: (userId) => api.get(`/ratings/${userId}`),
};

export default api;
