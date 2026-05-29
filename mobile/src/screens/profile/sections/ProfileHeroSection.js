import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Avatar, InlineError, Skeleton } from '../../../components/ui';
import ProfileSectionCard from '../../../components/profile/ProfileSectionCard';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme/typography';

const HERO_STATS = [
  { key: 'rating', label: 'Rating' },
  { key: 'wins', label: 'Ganados' },
  { key: 'matches', label: 'Partidos' },
];

export default function ProfileHeroSection({ hero, loading, error, onRetry, onOpenLeaderboard }) {
  const { colors, spacing, radius } = useTheme();
  const stats = Array.isArray(hero?.stats) ? hero.stats : [];
  const isV2Hero = stats.length > 0;

  if (loading) {
    return (
      <ProfileSectionCard>
        <View style={{ alignItems: isV2Hero ? 'flex-start' : 'center' }}>
          <Skeleton width={84} height={84} radius={42} style={{ marginBottom: spacing.md }} />
          <Skeleton width={160} height={20} style={{ marginBottom: spacing.sm }} />
          <Skeleton width={100} height={16} style={{ marginBottom: isV2Hero ? spacing.md : 0 }} />
          {isV2Hero ? (
            <>
              <Skeleton width="100%" height={16} style={{ marginBottom: spacing.sm }} />
              <Skeleton width="92%" height={16} style={{ marginBottom: spacing.md }} />
              <Skeleton width="100%" height={92} />
            </>
          ) : null}
        </View>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard>
      {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

      <View style={styles.header}>
        <Avatar src={hero?.avatar} name={hero?.name} avatarSeed={hero?.avatarSeed} size={84} />
        <Text style={[typography.h2, styles.name, { color: colors.text.primary }]} accessibilityRole="header">
          {hero?.name || 'Jugador'}
        </Text>
        {hero?.handle ? (
          <Text style={[typography.body, { color: colors.text.secondary }]}>{hero.handle}</Text>
        ) : null}
      </View>

      <View style={[styles.rankBadge, { backgroundColor: `${hero?.rankColor || colors.text.primary}18`, borderColor: `${hero?.rankColor || colors.text.primary}40`, borderRadius: radius.full }]}> 
        <Text style={[typography.captionMedium, { color: hero?.rankColor || colors.text.primary }]}> 
          {hero?.rankName || 'Sin categoría'}
        </Text>
      </View>

      {isV2Hero ? (
        <>
          <Text style={[typography.body, styles.bio, { color: colors.text.secondary }]}> 
            {hero?.bio || 'Sumá una bio corta para que tu perfil tenga más personalidad.'}
          </Text>

          <View style={styles.metaWrap}>
            {(hero?.meta || []).slice(0, 2).map((item) => (
              <View
                key={item.key}
                style={[
                  styles.metaPill,
                  {
                    backgroundColor: colors.surfaceHighlight,
                    borderColor: colors.borderLight,
                    borderRadius: radius.full,
                  },
                ]}
              >
                <Text style={[typography.caption, { color: colors.text.secondary }]} numberOfLines={1}>{item.label}</Text>
                <Text style={[typography.captionMedium, { color: colors.text.primary }]} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.statsRowV2, { borderColor: colors.borderLight, borderRadius: radius.xl, backgroundColor: colors.surfaceHighlight }]}> 
            {stats.map((item, index) => (
              <View
                key={item.key}
                style={[styles.statBoxV2, index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.borderLight }]}
                accessible
                accessibilityLabel={`${item.label}: ${item.value}${item.helper ? `, ${item.helper}` : ''}`}
              >
                <Text style={[typography.h3, styles.statValueV2, { color: colors.text.primary }]} numberOfLines={1}>{item.value}</Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>{item.label}</Text>
                {item.helper ? (
                  <Text style={[typography.caption, styles.statHelper, { color: colors.text.tertiary }]} numberOfLines={1}>{item.helper}</Text>
                ) : null}
              </View>
            ))}
          </View>
        </>
      ) : (
        <View style={[styles.statsRow, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight, borderRadius: radius.lg }]}> 
          {HERO_STATS.map((item, index) => {
            const value = item.key === 'rating'
              ? Number(hero?.ratingAverage || 0).toFixed(1)
              : item.key === 'wins'
                ? Number(hero?.wins || 0)
                : Number(hero?.matchesTotal || 0);

            return (
              <View key={item.key} style={[styles.statBox, index > 0 && { borderLeftWidth: 1, borderLeftColor: colors.borderLight }]}>
                <Text style={[typography.h3, { color: colors.text.primary }]}>{value}</Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>{item.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {onOpenLeaderboard ? (
        <TouchableOpacity
          onPress={onOpenLeaderboard}
          style={[styles.rankButton, { borderColor: colors.borderLight, borderRadius: radius.full, backgroundColor: colors.surfaceHighlight }]}
          accessibilityRole="button"
          accessibilityLabel="Ver tabla de clasificacion"
          accessibilityHint="Abre la tabla de posiciones competitiva"
        >
          <Feather name="award" size={16} color={hero?.rankColor || colors.text.primary} />
          <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Ver clasificacion</Text>
          <Feather name="arrow-right" size={16} color={colors.text.secondary} />
        </TouchableOpacity>
      ) : null}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
  },
  name: {
    marginTop: 12,
    textAlign: 'center',
  },
  bio: {
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 14,
  },
  rankBadge: {
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  metaWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaPill: {
    minHeight: 40,
    minWidth: '46%',
    maxWidth: '100%',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statsRowV2: {
    flexDirection: 'row',
    borderWidth: 1,
    overflow: 'hidden',
  },
  rankButton: {
    minHeight: 46,
    marginTop: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statBoxV2: {
    flex: 1,
    minHeight: 88,
    paddingHorizontal: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValueV2: {
    textAlign: 'center',
  },
  statHelper: {
    marginTop: 4,
    textAlign: 'center',
  },
});
