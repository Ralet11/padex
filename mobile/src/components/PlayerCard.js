import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import Avatar from './Avatar';
import { getRankByTier } from '../utils/rankings';
import { getCompetitiveRating, getCompetitiveTier, getReputationScore } from '../utils/domain';

const POSITION_LABEL = { drive: 'Drive', reves: 'Revés' };

export default function PlayerCard({ player, onPress, actionButton }) {
  const { colors } = useTheme();
  const tier = getCompetitiveTier(player);
  const rank = getRankByTier(tier);
  const catColor = rank.starColor || colors.text.primary;
  const reputationScore = getReputationScore(player);
  const competitiveRating = getCompetitiveRating(player);

  return (
    <TouchableOpacity style={[styles.card, { borderBottomColor: colors.borderLight }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.left}>
        <Avatar name={player.name} uri={player.avatar} size={52} category={rank.name} />
        <View style={styles.info}>
          <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: 2 }]} numberOfLines={1}>{player.name}</Text>
          <View style={styles.tags}>
            <View style={[styles.tag, { backgroundColor: catColor + '15', borderColor: catColor + '30' }]}>
              <Text style={[typography.captionMedium, { color: catColor }]}>{rank.name}</Text>
            </View>
            {player.position && (
              <View style={[styles.tag, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                <Text style={[typography.captionMedium, { color: colors.text.secondary }]}>{POSITION_LABEL[player.position] || player.position}</Text>
              </View>
            )}
          </View>
          <View style={styles.stats}>
            <Text style={[typography.caption, { color: colors.text.tertiary }]}>
              ⭐ {competitiveRating}
            </Text>
            {reputationScore > 0 && (
              <Text style={[typography.caption, { color: colors.text.tertiary }]}> 
                · <Feather name="star" size={10} color={colors.text.tertiary} /> {reputationScore}
              </Text>
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
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { marginLeft: 12, flex: 1 },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  tag: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  action: { marginLeft: spacing.sm },
});
