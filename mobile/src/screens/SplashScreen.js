import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';

const RING_SIZE = 68;
const ACCENT_SIZE = 58;

export default function SplashScreen() {
  const { isDark } = useTheme();
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();

    return () => {
      loop.stop();
      rotation.setValue(0);
    };
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const gradientColors = useMemo(
    () =>
      isDark
        ? ['#040404', '#0C1017']
        : ['#FCFCF8', '#F1F4E6'],
    [isDark]
  );

  const ringBaseColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(9,9,11,0.08)';
  const glowColor = isDark ? 'rgba(167, 206, 41, 0.16)' : 'rgba(167, 206, 41, 0.2)';

  return (
    <LinearGradient colors={gradientColors} style={styles.container}>
      <StatusBar style={isDark ? 'light' : 'dark'} hidden={false} />

      <View style={styles.loaderWrap}>
        <View style={[styles.glow, { backgroundColor: glowColor }]} />

        <View
          style={[
            styles.ringBase,
            {
              width: RING_SIZE,
              height: RING_SIZE,
              borderColor: ringBaseColor,
            },
          ]}
        />

        <Animated.View
          style={[
            styles.spinner,
            {
              width: ACCENT_SIZE,
              height: ACCENT_SIZE,
              transform: [{ rotate: spin }],
            },
          ]}
        >
          <View style={styles.accentArc} />
        </Animated.View>

        <View style={[styles.centerDot, { backgroundColor: isDark ? '#FFFFFF' : '#111111' }]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  ringBase: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 999,
  },
  spinner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  accentArc: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: '#A7CE29',
    shadowColor: '#A7CE29',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
});
