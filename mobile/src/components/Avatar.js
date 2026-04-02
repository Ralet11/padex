// TODO: DEPRECATED — migrate to components/ui/Avatar.js
// This legacy Avatar uses static theme import and is not theme-aware.
// Screens should import Avatar from '../../components/ui' instead.
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { resolveAssetUrl } from '../services/api';
import { colors } from '../theme';

import { RANK_CONFIG } from '../utils/rankings';

const findTierByName = (name) => {
  return Object.values(RANK_CONFIG).find(r => r.name === name)?.id || 7;
};

export default function Avatar({ uri, name, size = 44, category, showBadge = false, style }) {
  const tier = findTierByName(category);
  const rank = RANK_CONFIG[tier] || RANK_CONFIG[7];
  const bg = category ? rank.starColor : colors.primary;
  const initials = name
    ? name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const avatarUri = resolveAssetUrl(uri);

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
          <Text style={styles.badgeText}>{tier}</Text>
        </View>
      )}
    </View>
  );
}



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
