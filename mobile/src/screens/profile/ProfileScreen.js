import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { matchesAPI, ratingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { Avatar, Skeleton, InlineError } from '../../components/ui';
import MatchCard from '../../components/MatchCard';
import { RANK_CONFIG, getCategoryProgress, getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';
import { getCompetitiveLosses, getCompetitiveTier, getCompetitiveWins, getProgressionPoints, getReputationScore } from '../../utils/domain';

function RankProgressBar({ stars, tier }) {
  const { colors } = useTheme();
  const currentRank = getRankByTier(tier);
  const nextRank = RANK_CONFIG[tier - 1]; // Reminder: Tier 1 is highest
  const pct = getCategoryProgress(stars, tier);

  return (
    <View style={styles.eloBar}>
      <View style={[styles.eloTrack, { backgroundColor: colors.surfaceHighlight }]}>
        <View style={[styles.eloFill, { width: `${pct}%`, backgroundColor: currentRank.starColor }]} />
      </View>
      <View style={styles.eloMarkers}>
        <Text style={[typography.label, { color: currentRank.starColor }]}>{currentRank.name}</Text>
        {nextRank && <Text style={[typography.label, { color: colors.text.tertiary }]}>{nextRank.name}</Text>}
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const [myMatches, setMyMatches] = useState([]);
  const [ratingData, setRatingData] = useState({ avg_score: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function fetchData() {
    setError(null);
    try {
      const [matchRes, rateRes] = await Promise.all([
        matchesAPI.my(),
        ratingsAPI.get(user.id),
      ]);
      setMyMatches(matchRes.data.matches);
      setRatingData({ avg_score: rateRes.data.avg_score, total: rateRes.data.total });
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos del perfil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const rank = getRankByTier(getCompetitiveTier(user));
  const catColor = rank.starColor || colors.text.primary;
  const progressionPoints = getProgressionPoints(user);
  const reputationScore = getReputationScore({ ...user, avg_rating: ratingData.avg_score });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.text.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[typography.h1, { color: colors.text.primary }]}>Perfil</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={[styles.headerBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]} onPress={() => navigation.navigate('EditProfile')} accessibilityLabel="Editar perfil" accessibilityRole="button">
              <Feather name="edit-2" size={14} color={colors.text.primary} />
              <Text style={[typography.captionMedium, { color: colors.text.primary, marginLeft: 6 }]}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.headerBtn, { borderColor: colors.borderLight, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
              onPress={() => Alert.alert('¿Cerrar sesión?', '', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: logout },
              ])}
              accessibilityLabel="Cerrar sesión"
              accessibilityRole="button"
            >
              <Feather name="log-out" size={14} color={colors.danger} />
              <Text style={[typography.captionMedium, { color: colors.danger, marginLeft: 6 }]}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          {error && (
            <InlineError message={error} onRetry={fetchData} style={{ marginBottom: spacing.md }} />
          )}

          {loading ? (
            <View style={{ paddingVertical: spacing.lg }}>
              <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                <Skeleton width={88} height={88} radius={44} style={{ marginBottom: spacing.md }} />
                <Skeleton width={160} height={24} radius={8} style={{ marginBottom: spacing.sm }} />
                <Skeleton width={100} height={24} radius={12} />
              </View>
              <Skeleton width="100%" height={120} radius={radius.xl} style={{ marginBottom: spacing.md }} />
              <Skeleton width="100%" height={60} radius={radius.xl} style={{ marginBottom: spacing.md }} />
              <Skeleton width="100%" height={140} radius={radius.xl} />
            </View>
          ) : (
            <>
              {/* Profile hero */}
              <View style={styles.hero}>
                <Avatar name={user?.name} src={user?.avatar} size={88} />
                <Text style={[typography.h2, { color: colors.text.primary, marginTop: spacing.md }]}>{user?.name}</Text>
                <View style={[styles.catBadge, { backgroundColor: catColor + '15', borderColor: catColor + '30', borderWidth: 1 }]}>
                  <Text style={[typography.captionMedium, { color: catColor, textTransform: 'capitalize' }]}>{rank.name}</Text>
                </View>
              </View>

              {/* ELO */}
              <View style={[styles.card, { borderColor: colors.borderLight }]}>
                <View style={styles.eloHeader}>
                  <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Rango competitivo</Text>
                    <Text style={[typography.h3, { color: colors.text.primary }]}>
                    <Feather name="star" size={18} color={rank.starColor} /> {progressionPoints}
                  </Text>
                </View>
                <RankProgressBar stars={progressionPoints} tier={getCompetitiveTier(user)} />
                <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: spacing.sm, lineHeight: 18 }]}>
                  Tu progresión competitiva cambia por resultados de partidos. Las calificaciones de otros jugadores impactan solo tu reputación.
                </Text>

                <TouchableOpacity
                  style={[styles.rankButton, { backgroundColor: colors.text.primary }]}
                  onPress={() => navigation.navigate('Leaderboard')}
                  accessibilityLabel="Ver tabla de posiciones"
                  accessibilityRole="button"
                >
                  <Text style={[typography.bodyBold, { color: colors.accent }]}>Ver Tabla de Posiciones</Text>
                  <Feather name="arrow-right" size={16} color={colors.accent} />
                </TouchableOpacity>
              </View>

              {/* Stats Bar */}
              <View style={[styles.statsRow, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}>
                {[
                   { label: 'Ganados', value: getCompetitiveWins(user), color: colors.text.primary },
                   { label: 'Perdidos', value: getCompetitiveLosses(user), color: colors.text.secondary },
                     { label: 'Rating', value: reputationScore ? `${reputationScore}` : '—', color: colors.text.primary },
                  { label: 'Encuentros', value: myMatches.length, color: colors.text.secondary },
                ].map((s, i) => (
                  <View key={s.label} style={[styles.statBox, i !== 0 && { borderLeftWidth: 1, borderLeftColor: colors.borderLight }]}>
                    <Text style={[typography.h3, { color: s.color }]}>{s.value}</Text>
                    <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]}>{s.label}</Text>
                  </View>
                ))}
              </View>

              {/* Personal Info List */}
              <View style={[styles.infoCard, { borderColor: colors.borderLight }]}>
                {[
                  { icon: 'crosshair', label: 'Posición', value: user?.position },
                  { icon: 'shield', label: 'Paleta', value: user?.paddle_brand },
                  { icon: 'users', label: 'Compañero', value: user?.preferred_partner },
                  { icon: 'align-left', label: 'Biografía', value: user?.bio },
                ].map((item, index) => item.value ? (
                  <View key={item.label} style={[styles.infoRow, index !== 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}>
                    <Feather name={item.icon} size={18} color={colors.text.tertiary} style={styles.infoIcon} />
                    <Text style={[typography.body, { color: colors.text.secondary, flex: 1 }]}>{item.label}</Text>
                    <Text style={[typography.bodyMedium, { color: colors.text.primary, textTransform: 'capitalize', maxWidth: '55%', textAlign: 'right' }]}>{item.value}</Text>
                  </View>
                ) : null)}
              </View>

              {/* History */}
              <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.xl, marginBottom: spacing.md }]}>
                Historial de Partidos
              </Text>

              {myMatches.length === 0 ? (
                <View style={styles.emptyMatches}>
                  <Feather name="calendar" size={40} color={colors.text.tertiary} style={{ marginBottom: spacing.sm }} />
                  <Text style={[typography.body, { color: colors.text.secondary }]}>No jugaste partidos aún</Text>
                </View>
              ) : (
                myMatches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onPress={() => navigation.navigate('Inicio', { screen: 'MatchDetail', params: { matchId: m.id } })}
                  />
                ))
              )}
            </>
          )}
        </View>

        {/* Fill empty space at bottom for Tab Bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerActions: { flexDirection: 'row', gap: spacing.sm },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  content: { paddingHorizontal: screenPadding.horizontal },
  hero: { alignItems: 'center', paddingVertical: spacing.lg },
  catBadge: { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 6, marginTop: spacing.sm },
  card: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  eloHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  eloBar: { marginBottom: 8 },
  eloTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  eloFill: { height: '100%', borderRadius: 3 },
  eloMarkers: { flexDirection: 'row', justifyContent: 'space-between' },
  rankButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.lg,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: radius.xl,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  infoCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  infoIcon: { width: 32 },
  emptyMatches: { alignItems: 'center', paddingVertical: 40 },
});
