// TODO: DEPRECATED — migrate to components/ui/Input.js
// This legacy Input uses static theme import and is not theme-aware.
// Screens should import Input from '../../components/ui' instead.
import React, { useState } from 'react';
import { View, TextInput, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Input({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  error,
  icon,
  multiline,
  numberOfLines,
  style,
  inputStyle,
  ...props
}) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[
        styles.inputWrapper,
        focused && styles.focused,
        error && styles.errorBorder,
      ]}>
        {icon && <View style={styles.iconLeft}>{icon}</View>}
        <TextInput
          style={[
            styles.input,
            icon && styles.inputWithIcon,
            multiline && styles.multiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secureTextEntry && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'center'}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
            <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: spacing.md },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  focused: { borderColor: colors.primary },
  errorBorder: { borderColor: colors.error },
  iconLeft: { paddingLeft: 14 },
  input: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputWithIcon: { paddingLeft: 10 },
  multiline: { height: 100, paddingTop: 13 },
  eyeBtn: { paddingRight: 14, paddingVertical: 13 },
  eyeText: { fontSize: 16 },
  error: {
    fontSize: 12,
    color: colors.error,
    marginTop: 5,
  },
});
