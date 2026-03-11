import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, radius, spacing } from '../theme';
import Avatar from './Avatar';

const CATEGORY_COLOR = {
  principiante: '#6B7280',
  intermedio: '#3B82F6',
  avanzado: '#F59E0B',
  profesional: '#10B981',
};

const POSITION_LABEL = { drive: 'Drive', reves: 'Revés' };

export default function PlayerCard({ player, onPress, actionButton }) {
  const catColor = CATEGORY_COLOR[player.category] || colors.primary;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <Avatar name={player.name} uri={player.avatar} size={52} category={player.category} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{player.name}</Text>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: catColor + '22', borderColor: catColor + '44' }]}>
              <Text style={[styles.tagText, { color: catColor }]}>{player.category}</Text>
            </View>
            {player.position && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{POSITION_LABEL[player.position] || player.position}</Text>
              </View>
            )}
          </View>
          <View style={styles.stats}>
            <Text style={styles.elo}>⭐ {player.elo} ELO</Text>
            {player.avg_rating > 0 && (
              <Text style={styles.rating}>{'★'.repeat(Math.round(player.avg_rating))} {player.avg_rating}</Text>
            )}
          </View>
        </View>
      </View>
      {actionButton && <View style={styles.action}>{actionButton}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { marginLeft: 12, flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tag: {
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  stats: { flexDirection: 'row', gap: 10 },
  elo: { fontSize: 12, color: colors.textMuted },
  rating: { fontSize: 12, color: colors.accent },
  action: { marginLeft: spacing.sm },
});
