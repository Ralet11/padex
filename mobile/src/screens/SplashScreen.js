import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

export default function SplashScreen() {
  return (
    <LinearGradient colors={[colors.bg, '#0D1E35']} style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🎾</Text>
        <Text style={styles.title}>PadelApp</Text>
        <Text style={styles.subtitle}>Tu comunidad de padel</Text>
        <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 72, marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: colors.text, letterSpacing: -1 },
  subtitle: { fontSize: 16, color: colors.textSecondary, marginTop: 6, marginBottom: 40 },
  loader: { marginTop: 20 },
});
