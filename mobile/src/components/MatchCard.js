// TODO: DEPRECATED — consider migrating to components/ui/ with useTheme() pattern
// This component still imports legacy Avatar. Should be refactored to use ui/Avatar.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, shadows } from '../theme/spacing';
import { typography } from '../theme/typography';
import Avatar from './Avatar';
import { getRankByTier } from '../utils/rankings';
import { getCompetitiveTier, getMatchState, MATCH_STATES } from '../utils/domain';

const STATUS_CONFIG = {
  [MATCH_STATES.OPEN]: { label: 'Abierto', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  [MATCH_STATES.RESERVED]: { label: 'Reservado', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  [MATCH_STATES.IN_PROGRESS]: { label: 'En juego', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.1)' },
  [MATCH_STATES.COMPLETED]: { label: 'Finalizado', color: '#A1A1AA', bg: '#F4F4F5' },
  [MATCH_STATES.CANCELLED]: { label: 'Cancelado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
  [MATCH_STATES.DRAFT]: { label: 'Borrador', color: '#71717A', bg: 'rgba(113, 113, 122, 0.1)' },
};

function getPlayerPrice(totalCourtPrice, orderIndex = 0) {
  const basePrice = Number(totalCourtPrice || 0) / 4;
  return Math.round(basePrice + (orderIndex * 2000));
}

function getMatchCategoryLabel(match) {
  if (match?.open_category) return 'Libre';

  const fromTier = getRankByTier(match?.max_category_tier);
  const toTier = getRankByTier(match?.min_category_tier);
  const fromLabel = fromTier.name.split(' ')[0];
  const toLabel = toTier.name.split(' ')[0];

  return fromLabel === toLabel ? fromLabel : `${fromLabel} a ${toLabel}`;
}

function getDisplayTitle(match) {
  const trimmedTitle = String(match?.title || '').trim();
  if (trimmedTitle) return trimmedTitle;
  if (match?.court_name) return `Partido en ${match.court_name}`;
  return 'Partido abierto';
}

function formatShortText(value) {
  const text = String(value || '').replace(/\./g, '').trim();
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export default function MatchCard({ match, onPress, compact = false }) {
  const { colors, isDark } = useTheme();
  const matchState = getMatchState(match);
  const status = STATUS_CONFIG[matchState] || STATUS_CONFIG[MATCH_STATES.OPEN];
  const playerCount = match.player_count ?? match.players?.length ?? 0;
  const spotsLeft = Math.max(0, (match.max_players || 4) - playerCount);
  const categoryLabel = getMatchCategoryLabel(match);
  const displayTitle = getDisplayTitle(match);
  const categoryTone = match?.open_category
    ? { color: '#0F766E', backgroundColor: 'rgba(16, 185, 129, 0.14)' }
    : {
      color: getRankByTier(match?.max_category_tier).starColor || colors.text.primary,
      backgroundColor: colors.surfaceHighlight,
    };

  const creatorTier = getCompetitiveTier({ competitive_tier: match?.creator_competitive_tier, category_tier: match?.creator_category });
  const date = new Date(`${match.date}T${match.time}`);
  const weekdayLabel = formatShortText(date.toLocaleDateString('es-AR', { weekday: 'short' }));
  const dateLabel = formatShortText(date.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }));
  const timeStr = match.time?.slice(0, 5) || '--:--';

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: isDark ? '#000' : '#A1A1AA',
    },
    compact && styles.cardCompact,
  ];
  const avatarSize = compact ? 26 : 30;

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[styles.topRow, compact && styles.topRowCompact]}>
        <View style={[styles.statusBadge, compact && styles.statusBadgeCompact, { backgroundColor: status.bg }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[typography.captionMedium, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <View style={[styles.chevronBadge, compact && styles.chevronBadgeCompact, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
          <Feather name="arrow-up-right" size={15} color={colors.text.tertiary} />
        </View>
      </View>

      <View style={[styles.heroRow, compact && styles.heroRowCompact]}>
        <View style={[styles.timePanel, compact && styles.timePanelCompact, { backgroundColor: colors.text.primary }]}>
          <Text style={[typography.label, { color: colors.accent }]}>
            {weekdayLabel}
          </Text>
          <Text style={[typography.h3, styles.timePanelTime, compact && styles.timePanelTimeCompact, { color: colors.text.inverse }]}>
            {timeStr}
          </Text>
          <Text style={[typography.captionMedium, { color: colors.text.inverse, opacity: 0.72 }]}>
            {dateLabel}
          </Text>
        </View>

        <View style={[styles.heroContent, compact && styles.heroContentCompact]}>
          <Text style={[typography.h3, styles.cardTitle, compact && styles.cardTitleCompact, { color: colors.text.primary }]} numberOfLines={2}>
            {displayTitle}
          </Text>

          <View style={[styles.locationRow, compact && styles.locationRowCompact]}>
            <Feather name="map-pin" size={14} color={colors.text.tertiary} />
            <Text style={[typography.body, { color: colors.text.secondary, flex: 1 }]} numberOfLines={1}>
              {match.court_name || 'Cancha a confirmar'}
            </Text>
          </View>

          <View style={[styles.metaRow, compact && styles.metaRowCompact]}>
            <View style={[styles.categoryBadge, compact && styles.metaBadgeCompact, { backgroundColor: categoryTone.backgroundColor }]}>
              <Text style={[typography.captionMedium, { color: categoryTone.color }]}>
                {categoryLabel}
              </Text>
            </View>
            <View style={[styles.priceBadge, compact && styles.metaBadgeCompact, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
              <Text style={[typography.captionMedium, { color: colors.text.primary }]}>
                Desde ${getPlayerPrice(match.price, 0).toLocaleString('es-AR')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.divider, compact && styles.dividerCompact, { backgroundColor: colors.borderLight }]} />

      <View style={[styles.footer, compact && styles.footerCompact]}>
        <View style={styles.playersRow}>
          <Avatar
            name={match.creator_name}
            uri={match.creator_avatar}
            size={avatarSize}
            category={getRankByTier(creatorTier).name}
          />
          <View style={styles.organizerTextWrap}>
            <Text style={[typography.captionMedium, { color: colors.text.primary }]} numberOfLines={1}>
              {match.creator_name}
            </Text>
            <Text style={[typography.caption, { color: colors.text.secondary }]}>
              Organiza el partido
            </Text>
          </View>
        </View>

        {matchState === MATCH_STATES.OPEN ? (
          <View
            style={[
              styles.spotsBadge,
              compact && styles.spotsBadgeCompact,
              {
                backgroundColor: spotsLeft === 0 ? 'rgba(239, 68, 68, 0.12)' : colors.text.primary,
                borderColor: spotsLeft === 0 ? 'rgba(239, 68, 68, 0.18)' : colors.text.primary,
              },
            ]}
          >
            <Text
              style={[
                typography.captionMedium,
                { color: spotsLeft === 0 ? colors.danger : colors.text.inverse, fontWeight: '700' },
              ]}
            >
              {spotsLeft === 0 ? 'Lleno' : `${spotsLeft} lugares`}
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    ...shadows.md,
  },
  cardCompact: {
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topRowCompact: {
    marginBottom: spacing.xs,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
  },
  statusBadgeCompact: {
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  chevronBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronBadgeCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  heroRowCompact: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  timePanel: {
    width: 92,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timePanelCompact: {
    width: 80,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  timePanelTime: {
    marginTop: 6,
    marginBottom: 4,
  },
  timePanelTimeCompact: {
    marginTop: 4,
    marginBottom: 2,
    fontSize: 18,
    lineHeight: 24,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 108,
  },
  heroContentCompact: {
    minHeight: 92,
  },
  cardTitle: {
    lineHeight: 26,
  },
  cardTitleCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  locationRowCompact: {
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  metaRowCompact: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
  metaBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  priceBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
  dividerCompact: {
    marginBottom: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  footerCompact: {
    gap: spacing.sm,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  organizerTextWrap: {
    flex: 1,
  },
  spotsBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  spotsBadgeCompact: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
