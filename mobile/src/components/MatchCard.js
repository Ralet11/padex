import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';
import Avatar from './Avatar';

const STATUS_CONFIG = {
  open: { label: 'Abierto', color: colors.primary, bg: colors.primaryBg },
  reserved: { label: 'Reservado', color: colors.accent, bg: colors.accentBg },
  completed: { label: 'Finalizado', color: colors.textMuted, bg: colors.card },
  cancelled: { label: 'Cancelado', color: colors.error, bg: colors.errorBg },
};

export default function MatchCard({ match, onPress, compact = false }) {
  const status = STATUS_CONFIG[match.status] || STATUS_CONFIG.open;
  const playerCount = match.player_count ?? match.players?.length ?? 0;
  const spotsLeft = match.max_players - playerCount;
  const date = new Date(`${match.date}T${match.time}`);
  const dayStr = date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  const timeStr = match.time?.slice(0, 5);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={styles.courtName} numberOfLines={1}>{match.court_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>
      </View>

      {/* Title */}
      {match.title ? (
        <Text style={styles.title} numberOfLines={1}>{match.title}</Text>
      ) : null}

      {/* Date + Time */}
      <View style={styles.row}>
        <View style={styles.chip}>
          <Text style={styles.chipIcon}>📅</Text>
          <Text style={styles.chipText}>{dayStr}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipIcon}>⏰</Text>
          <Text style={styles.chipText}>{timeStr}</Text>
        </View>
        <View style={styles.chip}>
          <Text style={styles.chipIcon}>💰</Text>
          <Text style={styles.chipText}>${match.price?.toLocaleString('es-AR')}</Text>
        </View>
      </View>

      {/* Players */}
      <View style={styles.footer}>
        <View style={styles.playersRow}>
          <Avatar name={match.creator_name} uri={match.creator_avatar} size={28} category={match.creator_category} />
          <Text style={styles.playersText}>
            {playerCount}/{match.max_players} jugadores
          </Text>
        </View>
        {match.status === 'open' && (
          <View style={[styles.spotsChip, spotsLeft === 0 ? { backgroundColor: colors.errorBg } : {}]}>
            <Text style={[styles.spotsText, { color: spotsLeft === 0 ? colors.error : colors.primary }]}>
              {spotsLeft === 0 ? 'Completo' : `${spotsLeft} lugar${spotsLeft > 1 ? 'es' : ''}`}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
  courtName: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full },
  statusText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: 9,
    paddingVertical: 5,
    gap: 4,
  },
  chipIcon: { fontSize: 12 },
  chipText: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  playersRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playersText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  spotsChip: {
    backgroundColor: colors.primaryBg,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  spotsText: { fontSize: 12, fontWeight: '700' },
});
