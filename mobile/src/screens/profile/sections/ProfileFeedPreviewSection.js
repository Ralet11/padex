import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { InlineError, Skeleton } from '../../../components/ui';
import ProfileSectionCard from '../../../components/profile/ProfileSectionCard';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme/typography';

export default function ProfileFeedPreviewSection({ feed, loading, error, onRetry, onMatchPress }) {
  const { colors, spacing, radius } = useTheme();

  if (loading) {
    return (
      <ProfileSectionCard>
        <Skeleton width={170} height={18} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={110} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="100%" height={110} />
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard>
      <View style={styles.headerRow}>
        <View>
          <Text style={[typography.h3, { color: colors.text.primary }]} accessibilityRole="header">Feed</Text>
          <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}> 
            {feed?.hero?.handle ? `${feed.hero.handle} · ${feed.hero.reputation}★` : `${feed?.hero?.reputation || '0'}★ de reputación`}
          </Text>
        </View>
        <Text style={[typography.caption, styles.headerMeta, { color: colors.text.secondary }]}>{feed?.totalItems || feed?.previewLimit || 0} movimientos</Text>
      </View>

      {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

      {feed?.hasItems ? (
        <View style={styles.list}>
          {feed.items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onMatchPress?.(item.match)}
              style={[styles.itemCard, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}
              accessibilityLabel={`Abrir item del feed ${item.title}`}
              accessibilityHint="Abre el detalle del partido"
              accessibilityRole="button"
              hitSlop={{ top: 6, right: 4, bottom: 6, left: 4 }}
            >
              <View style={styles.itemMetaTop}>
                <View style={[styles.feedDot, { backgroundColor: item?.outcome?.tone === 'success' ? colors.success : item?.outcome?.tone === 'danger' ? colors.danger : colors.accent }]} />
                <Text style={[typography.captionMedium, { color: colors.text.secondary }]} numberOfLines={1}> 
                  {(item.meta || [item.dateLabel, item.status]).filter(Boolean).join(' · ') || 'Actividad reciente'}
                </Text>
              </View>

              <View style={styles.itemTop}>
                <Text style={[typography.bodyBold, styles.itemTitle, { color: colors.text.primary }]}>{item.title}</Text>
                <Feather name="arrow-up-right" size={16} color={colors.text.tertiary} />
              </View>

              <Text style={[typography.body, styles.itemSubtitle, { color: colors.text.secondary }]}>{item.subtitle || item.opponentOrCourt || 'Cancha a confirmar'}</Text>

              <View style={styles.itemBottom}>
                <View style={[styles.statusPill, { borderColor: colors.borderLight, borderRadius: radius.full, backgroundColor: colors.surface }]}> 
                  <Feather name={item?.outcome?.icon || 'clock'} size={12} color={colors.text.secondary} />
                  <Text style={[typography.caption, { color: colors.text.secondary }]}>{item?.outcome?.label || item.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.empty, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}> 
          <Feather name="grid" size={20} color={colors.text.secondary} />
          <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: spacing.xs }]}>{feed?.emptyState?.title || 'Tu feed todavía está vacío'}</Text>
          <Text style={[typography.body, styles.emptyText, { color: colors.text.secondary, marginTop: spacing.xs }]}>{feed?.emptyState?.message || 'Jugá un partido para empezar a mover tu perfil.'}</Text>
        </View>
      )}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  headerMeta: {
    textAlign: 'right',
    flexShrink: 1,
    paddingTop: 2,
  },
  list: {
    gap: 8,
  },
  itemMetaTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  itemCard: {
    borderWidth: 1,
    padding: 14,
    minHeight: 120,
  },
  itemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
  },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  itemSubtitle: {
    lineHeight: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 28,
    paddingHorizontal: 10,
    justifyContent: 'center',
    gap: 4,
  },
  empty: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
  },
});
