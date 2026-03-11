import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BASE_URL } from '../services/api';
import { colors } from '../theme';

const CATEGORY_COLORS = {
  principiante: '#6B7280',
  intermedio: '#3B82F6',
  avanzado: '#F59E0B',
  profesional: '#10B981',
};

export default function Avatar({ uri, name, size = 44, category, showBadge = false, style }) {
  const bg = category ? CATEGORY_COLORS[category] || colors.primary : colors.primary;
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarUri = uri
    ? uri.startsWith('http')
      ? uri
      : `${BASE_URL}${uri}`
    : null;

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={[styles.img, { borderRadius: size / 2 }]}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: bg, borderRadius: size / 2, width: size, height: size }]}>
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
        </View>
      )}
      {showBadge && category && (
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={styles.badgeText}>{CATEGORY_LABELS[category] || ''}</Text>
        </View>
      )}
    </View>
  );
}

const CATEGORY_LABELS = {
  principiante: 'P',
  intermedio: 'I',
  avanzado: 'A',
  profesional: 'PRO',
};

const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  img: { width: '100%', height: '100%' },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#fff', fontWeight: '700' },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 8, fontWeight: '800' },
});
