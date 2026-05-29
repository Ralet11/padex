import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Typography } from '../ui/Typography';

export default function AuthBrandHeader({ onBack, size = 'md' }) {
  const { colors } = useTheme();
  const isCompact = size === 'sm';

  return (
    <View style={styles.row}>
      <View style={styles.side}>
        {onBack ? (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Volver"
            onPress={onBack}
            activeOpacity={0.7}
            style={styles.backBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <ChevronLeft color="#FFFFFF" size={20} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.brand}>
        <Typography
          variant="bodyBold"
          align="center"
          style={[styles.brandName, isCompact && styles.brandNameCompact]}
        >
          Padex
        </Typography>
        <View
          style={[
            styles.underline,
            isCompact && styles.underlineCompact,
            { backgroundColor: colors.accent },
          ]}
        />
      </View>

      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  side: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  brand: {
    flex: 1,
    alignItems: 'center',
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  brandNameCompact: {
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  underline: {
    marginTop: 6,
    width: 64,
    height: 3,
    borderRadius: 999,
  },
  underlineCompact: {
    marginTop: 5,
    width: 48,
    height: 2,
  },
});
