import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing, shadows } from '../theme/spacing';
import { typography } from '../theme/typography';
import Avatar from './Avatar';
import { getRankByTier } from '../utils/rankings';

const STATUS_CONFIG = {
  open: { label: 'Abierto', color: '#10B981', bg: 'rgba(16, 185, 129, 0.1)' },
  reserved: { label: 'Reservado', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.1)' },
  completed: { label: 'Finalizado', color: '#A1A1AA', bg: '#F4F4F5' },
  cancelled: { label: 'Cancelado', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.1)' },
};

function getPlayerPrice(totalCourtPrice, orderIndex = 0) {
  const basePrice = Number(totalCourtPrice || 0) / 4;
  return Math.round(basePrice + (orderIndex * 2000));
}

export default function MatchCard({ match, onPress, compact = false }) {
  const { colors, isDark } = useTheme();
  const status = STATUS_CONFIG[match.status] || STATUS_CONFIG.open;
  const playerCount = match.player_count ?? match.players?.length ?? 0;
  const spotsLeft = match.max_players - playerCount;

  const date = new Date(`${match.date}T${match.time}`);
  const dayStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '');
  const timeStr = match.time?.slice(0, 5);

  const cardStyle = [
    styles.card,
    {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      shadowColor: isDark ? '#000' : '#A1A1AA',
    }
  ];

  return (
    <TouchableOpacity
      style={cardStyle}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[typography.label, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <Text style={[typography.caption, { color: colors.text.secondary }]}>
          {match.court_name}
        </Text>
      </View>

      {/* Title */}
      {match.title ? (
        <Text style={[typography.h3, { color: colors.text.primary, marginBottom: spacing.xs }]} numberOfLines={1}>
          {match.title}
        </Text>
      ) : null}

      {/* Time & Date Display - Big Typography Style */}
      <View style={styles.timeContainer}>
        <Text style={[typography.body, { color: colors.text.secondary, textTransform: 'capitalize' }]}>
          {dayStr}
        </Text>
        <View style={styles.dotSeparator} />
        <Text style={[typography.h2, { color: colors.text.primary }]}>
          {timeStr}
        </Text>
      </View>

      {/* Price tag */}
      <View style={{ marginBottom: spacing.md }}>
        <Text style={[typography.captionMedium, { color: colors.text.secondary }]}>
          Desde ${getPlayerPrice(match.price, 0).toLocaleString('es-AR')}
        </Text>
      </View>

      {/* Footer Divider */}
      <View style={[styles.divider, { backgroundColor: colors.borderLight }]} />

      {/* Footer: Creator & Spots */}
      <View style={styles.footer}>
        <View style={styles.playersRow}>
          <Avatar 
            name={match.creator_name} 
            uri={match.creator_avatar} 
            size={28} 
            category={getRankByTier(match.creator_category).name} 
          />
          <View>
            <Text style={[typography.captionMedium, { color: colors.text.primary }]}>{match.creator_name}</Text>
            <Text style={[typography.caption, { color: colors.text.secondary }]}>Organizador</Text>
          </View>
        </View>

        {match.status === 'open' && (
          <View style={[
            styles.spotsBadge,
            { backgroundColor: spotsLeft === 0 ? colors.danger : colors.text.primary }
          ]}>
            <Text style={[typography.captionMedium, { color: colors.background, fontWeight: '700' }]}>
              {spotsLeft === 0 ? 'Lleno' : `${spotsLeft} lugares`}
            </Text>
          </View>
        )}
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
    ...shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#A1A1AA',
    alignSelf: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  spotsBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.full,
  },
});
