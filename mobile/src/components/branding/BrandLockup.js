import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Typography } from '../ui/Typography';

export default function BrandLockup({
  size = 'md',
  kicker = 'LA APP DEL NUEVO PADEL',
  subtitle,
}) {
  const isLarge = size === 'lg';

  return (
    <View style={styles.wrapper}>
      <View style={[styles.kickerPill, isLarge && styles.kickerPillLarge]}>
        <Typography
          variant="label"
          align="center"
          style={[styles.kickerText, isLarge && styles.kickerTextLarge]}
        >
          {kicker}
        </Typography>
      </View>

      <View style={[styles.brandRow, isLarge && styles.brandRowLarge]}>
        <View style={[styles.markShell, isLarge ? styles.markShellLarge : styles.markShellMedium]}>
          <Image
            source={require('../../../assets/ball-mark.png')}
            style={[styles.mark, isLarge ? styles.markLarge : styles.markMedium]}
            resizeMode="contain"
          />
        </View>

        <Typography
          variant={isLarge ? 'h1' : 'h2'}
          align="center"
          style={[styles.wordmark, isLarge && styles.wordmarkLarge]}
        >
          Padex
        </Typography>
      </View>

      {subtitle ? (
        <Typography
          variant={isLarge ? 'bodyLarge' : 'bodyMedium'}
          align="center"
          style={[styles.subtitle, isLarge && styles.subtitleLarge]}
        >
          {subtitle}
        </Typography>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  kickerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(167, 206, 41, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167, 206, 41, 0.18)',
  },
  kickerPillLarge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  kickerText: {
    color: '#B7DA49',
    letterSpacing: 1,
  },
  kickerTextLarge: {
    letterSpacing: 1.2,
  },
  brandRow: {
    marginTop: 16,
    flexDirection: 'column',
    alignItems: 'center',
  },
  brandRowLarge: {
    marginTop: 20,
  },
  markShell: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#020617',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  markShellLarge: {
    width: 58,
    height: 58,
    borderRadius: 20,
  },
  markShellMedium: {
    width: 48,
    height: 48,
  },
  mark: {
    tintColor: undefined,
  },
  markLarge: {
    width: 34,
    height: 34,
    transform: [{ translateY: 4 }],
  },
  markMedium: {
    width: 28,
    height: 28,
    transform: [{ translateY: 3.25 }],
  },
  wordmark: {
    marginTop: 7,
    color: '#B7DA49',
    letterSpacing: -0.8,
  },
  wordmarkLarge: {
    marginTop: 8,
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 14,
    maxWidth: 300,
    color: 'rgba(255, 255, 255, 0.74)',
  },
  subtitleLarge: {
    maxWidth: 340,
  },
});
