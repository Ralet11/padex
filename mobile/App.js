import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation';

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor="#0A0E1A" />
      <AppNavigator />
    </AuthProvider>
  );
}
