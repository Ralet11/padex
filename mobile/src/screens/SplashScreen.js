import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLockup from '../components/branding/BrandLockup';
import { useTheme } from '../theme/ThemeContext';

export default function SplashScreen() {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark ? [colors.background, '#0D1E35'] : [colors.background, '#F0F4E8']}
      style={styles.container}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} hidden={false} />
      <View style={styles.content}>
        <BrandLockup
          size="lg"
          kicker="PARTIDOS. RANKING. LIGA."
          subtitle="La app para encontrar partidos, organizar tu juego y seguir tu progreso."
        />
        <ActivityIndicator color={colors.accent} size="large" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loader: { marginTop: 36 },
});
