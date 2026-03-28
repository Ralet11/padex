import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, radius, typography } from '../theme';

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    isDisabled && styles.disabled,
    style,
  ];

  const txtStyle = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity style={buttonStyle} onPress={onPress} disabled={isDisabled} activeOpacity={0.8}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.white : colors.primary} size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={txtStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { marginRight: 2 },

  // Variants
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.error },
  accent: { backgroundColor: colors.accent },

  // Sizes
  size_sm: { paddingHorizontal: 16, paddingVertical: 8 },
  size_md: { paddingHorizontal: 20, paddingVertical: 13 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 16 },

  disabled: { opacity: 0.5 },

  // Text
  text: { fontWeight: '700', textAlign: 'center' },
  text_primary: { color: colors.white },
  text_secondary: { color: colors.text.primary },
  text_outline: { color: colors.primary },
  text_ghost: { color: colors.primary },
  text_danger: { color: colors.white },
  text_accent: { color: colors.white },

  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 17 },
});
