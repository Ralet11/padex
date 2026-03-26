import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const savedToken = await AsyncStorage.getItem('token');
      if (savedToken) {
        console.log('[auth] restoring session', { hasToken: true });
        const res = await authAPI.me();
        setUser(res.data.user);
        setToken(savedToken);
        initSocket(savedToken);
      }
    } catch (err) {
      console.warn('[auth] restore session failed', { message: err.message });
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    console.log('[auth] login start', { email: email.trim().toLowerCase() });
    const res = await authAPI.login({ email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    initSocket(t);
    console.log('[auth] login success', { userId: u.id, role: u.role });
    return u;
  }

  async function register(data) {
    console.log('[auth] register start', {
      email: data.email?.trim().toLowerCase(),
      hasConfirmPassword: Boolean(data.confirmPassword),
    });
    const res = await authAPI.register(data);
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    initSocket(t);
    console.log('[auth] register success', { userId: u.id, role: u.role });
    return u;
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    disconnectSocket();
    setToken(null);
    setUser(null);
  }

  function updateUser(updatedUser) {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
