import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

export default function SystemBars() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    NavigationBar.setVisibilityAsync('visible').catch(() => {});
    NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark').catch(() => {});
    NavigationBar.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [isDark, colors.background]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} hidden={false} />
      {Platform.OS === 'android' && insets.bottom > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.navBarUnderlay, { height: insets.bottom, backgroundColor: colors.background }]}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  navBarUnderlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
  },
});
