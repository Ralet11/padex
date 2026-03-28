import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import BrandLockup from '../components/branding/BrandLockup';

export default function SplashScreen() {
  return (
    <LinearGradient colors={['#0A0E1A', '#0D1E35']} style={styles.container}>
      <StatusBar style="light" hidden={false} />
      <View style={styles.content}>
        <BrandLockup
          size="lg"
          kicker="PARTIDOS. RANKING. LIGA."
          subtitle="La app para encontrar partidos, organizar tu juego y seguir tu progreso."
        />
        <ActivityIndicator color="#A7CE29" size="large" style={styles.loader} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loader: { marginTop: 36 },
});
