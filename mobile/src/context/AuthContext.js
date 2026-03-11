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
        const res = await authAPI.me();
        setUser(res.data.user);
        setToken(savedToken);
        initSocket(savedToken);
      }
    } catch {
      await AsyncStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await authAPI.login({ email, password });
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    initSocket(t);
    return u;
  }

  async function register(data) {
    const res = await authAPI.register(data);
    const { token: t, user: u } = res.data;
    await AsyncStorage.setItem('token', t);
    setToken(t);
    setUser(u);
    initSocket(t);
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
