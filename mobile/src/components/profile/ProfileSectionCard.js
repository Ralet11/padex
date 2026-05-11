import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export default function ProfileSectionCard({
  children,
  style,
  withChrome = true,
  withPadding = true,
  withShadow = true,
  marginBottom = true,
}) {
  const { colors, radius, shadows, spacing } = useTheme();

  return (
    <View
      style={[
        styles.base,
        withChrome && {
          backgroundColor: colors.surface,
          borderColor: colors.borderLight,
          borderRadius: radius.xl,
          borderWidth: 1,
        },
        withPadding && {
          padding: spacing.md,
        },
        marginBottom && {
          marginBottom: spacing.md,
        },
        withShadow && shadows.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
