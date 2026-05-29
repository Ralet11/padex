// TODO: DEPRECATED — migrate to components/ui/Avatar.js
// This legacy Avatar uses static theme import and is not theme-aware.
// Screens should import Avatar from '../../components/ui' instead.
import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { resolveAssetUrl } from '../services/api';
import { colors } from '../theme';
import { GeneratedAvatar } from './ui/GeneratedAvatar';

import { RANK_CONFIG } from '../utils/rankings';

const findTierByName = (name) => {
  return Object.values(RANK_CONFIG).find(r => r.name === name)?.id || 7;
};

export default function Avatar({ uri, name, size = 44, category, avatarSeed, avatar_seed, showBadge = false, style }) {
  const tier = findTierByName(category);
  const rank = RANK_CONFIG[tier] || RANK_CONFIG[7];
  const [imageFailed, setImageFailed] = useState(false);

  const avatarUri = resolveAssetUrl(uri);
  const shouldRenderImage = Boolean(avatarUri) && !imageFailed;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUri]);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {shouldRenderImage ? (
        <Image
          source={{ uri: avatarUri }}
          style={[styles.img, { borderRadius: size / 2 }]}
          onError={() => setImageFailed(true)}
        />
      ) : (
        <GeneratedAvatar
          seed={avatarSeed || avatar_seed}
          name={name}
          size={size}
          style={{ borderRadius: size / 2 }}
        />
      )}
      {showBadge && category && (
        <View style={[styles.badge, { backgroundColor: rank.starColor || colors.primary }]}>
          <Text style={styles.badgeText}>{tier}</Text>
        </View>
      )}
    </View>
  );
}



const styles = StyleSheet.create({
  wrapper: { position: 'relative' },
  img: { width: '100%', height: '100%' },
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
