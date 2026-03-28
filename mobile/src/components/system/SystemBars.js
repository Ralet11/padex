import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const NAV_BAR_COLOR = '#0A0E1A';

export default function SystemBars() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    NavigationBar.setVisibilityAsync('visible').catch(() => {});
    NavigationBar.setButtonStyleAsync('light').catch(() => {});
    NavigationBar.setStyle('dark');
  }, []);

  return (
    <>
      <StatusBar style="dark" hidden={false} />
      {Platform.OS === 'android' && insets.bottom > 0 ? (
        <View
          pointerEvents="none"
          style={[styles.navBarUnderlay, { height: insets.bottom }]}
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
    backgroundColor: NAV_BAR_COLOR,
    zIndex: 50,
    elevation: 50,
  },
});
