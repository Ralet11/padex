import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI, socialAPI, ratingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Avatar, Button, Skeleton, InlineError, useToast } from '../../components/ui';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';
import { getCompetitiveLosses, getCompetitiveTier, getCompetitiveWins, getProgressionPoints, getReputationRatingsCount, getReputationScore } from '../../utils/domain';

export default function PlayerProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: me } = useAuth();
  const { colors, spacing, radius } = useTheme();
  const toast = useToast();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [connection, setConnection] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    setError(null);
    Promise.all([
      profileAPI.get(userId),
      ratingsAPI.get(userId),
    ]).then(([pRes, rRes]) => {
      setProfile(pRes.data.user);
      setConnection(pRes.data.connection);
      setRatings(rRes.data.ratings);
    }).catch((err) => {
      setError(err.message || 'No se pudo cargar el perfil');
    }).finally(() => setLoading(false));
  }, [userId]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      if (!connection) {
        const res = await socialAPI.connect(userId);
        setConnection(res.data.connection);
        toast.show('Solicitud enviada');
      } else if (connection.status === 'accepted') {
        Alert.alert('¿Eliminar compañero?', '', [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Eliminar', style: 'destructive', onPress: async () => {
              await socialAPI.disconnect(connection.id);
              setConnection(null);
            },
          },
        ]);
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading || !profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={{ paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.xl }}>
          <Skeleton height={88} width={88} radius={44} style={{ alignSelf: 'center', marginBottom: spacing.md }} />
          <Skeleton height={24} width="50%" style={{ alignSelf: 'center', marginBottom: spacing.sm }} />
          <Skeleton height={20} width="30%" style={{ alignSelf: 'center', marginBottom: spacing.xl }} />
          <Skeleton height={80} width="100%" radius={radius.lg} style={{ marginBottom: spacing.md }} />
          <Skeleton height={60} width="100%" radius={radius.lg} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.xxl }]}>
        <InlineError message={error} onRetry={() => {
          setError(null);
          setLoading(true);
          Promise.all([
            profileAPI.get(userId),
            ratingsAPI.get(userId),
          ]).then(([pRes, rRes]) => {
            setProfile(pRes.data.user);
            setConnection(pRes.data.connection);
            setRatings(rRes.data.ratings);
          }).catch((err) => {
            setError(err.message || 'No se pudo cargar el perfil');
          }).finally(() => setLoading(false));
        }} />
      </View>
    );
  }

  const isMine = profile.id === me.id;
  const isAccepted = connection?.status === 'accepted';
  const isPending = connection?.status === 'pending';

  const rank = getRankByTier(getCompetitiveTier(profile));
  const catColor = rank.starColor || colors.primary;
  const progressionPoints = getProgressionPoints(profile);
  const reputationScore = getReputationScore(profile);
  const reputationCount = getReputationRatingsCount(profile);
  const floatingTabBarHeight = 60;
  const floatingTabBarGap = 16;
  const footerBottomOffset = floatingTabBarHeight + floatingTabBarGap + Math.max(insets.bottom, spacing.sm);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: footerBottomOffset + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Avatar name={profile.name} uri={profile.avatar} size={88} category={rank.name} />
          <Text style={[typography.h2, { color: colors.text.primary, marginTop: 14 }]}>{profile.name}</Text>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
            <Text style={[typography.captionMedium, { color: catColor }]}>{rank.name}</Text>
          </View>
          {profile.bio && <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 20 }]}>{profile.bio}</Text>}
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.statBox}>
            <Text style={[typography.bodyBold, { color: rank.starColor }]}>⭐ {progressionPoints}</Text>
            <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 3 }]}>PROGRESIÓN</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
              <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{getCompetitiveWins(profile)}</Text>
              <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 3 }]}>Ganados</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statBox}>
              <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{getCompetitiveLosses(profile)}</Text>
              <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 3 }]}>Perdidos</Text>
            </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statBox}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
              {reputationScore > 0 ? `★ ${reputationScore}` : '—'}
            </Text>
            <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 3 }]}>{reputationCount > 0 ? `${reputationCount} ratings` : 'Reputación'}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          {[
            { icon: '🎾', label: 'Posición', value: profile.position },
            { icon: '🏓', label: 'Paleta', value: profile.paddle_brand },
            { icon: '🏟️', label: 'Cancha fav.', value: profile.favorite_court_id ? `Cancha ${profile.favorite_court_id}` : null },
            { icon: '🤝', label: 'Compañero preferido', value: profile.preferred_partner },
          ].filter((i) => i.value).map((item) => (
            <View key={item.label} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={{ fontSize: 18, width: 28 }}>{item.icon}</Text>
              <Text style={[typography.body, { color: colors.text.secondary, flex: 1 }]}>{item.label}</Text>
              <Text style={[typography.captionMedium, { color: colors.text.primary }]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Calificaciones */}
        {ratings.length > 0 && (
          <View>
            <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: 12 }]}>Calificaciones recientes</Text>
            {ratings.slice(0, 5).map((r) => (
              <View key={r.id} style={[styles.ratingCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
                <View style={styles.ratingLeft}>
                  <Avatar name={r.rater_name} uri={r.rater_avatar} size={32} />
                  <Text style={[typography.captionMedium, { color: colors.text.primary }]}>{r.rater_name}</Text>
                </View>
                <View style={styles.ratingRight}>
                  <Text style={[typography.caption, { color: colors.accent }]}>{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</Text>
                  {r.comment && <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2, maxWidth: 150, textAlign: 'right' }]}>{r.comment}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer actions */}
      {!isMine && (
        <View style={[styles.footer, { marginBottom: footerBottomOffset, borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {isAccepted && (
            <Button
              title="💬 Enviar mensaje"
              onPress={() => navigation.navigate('Chat', { connectionId: connection.id, partnerName: profile.name })}
              variant="outline"
              size="lg"
              style={{ flex: 1, marginRight: 8 }}
            />
          )}
          <Button
            title={
              !connection ? '+ Conectar' :
                isPending ? (connection.requester_id === me.id ? '⏳ Enviada' : '✓ Aceptar') :
                  isAccepted ? '✓ Compañero' : '+ Conectar'
            }
            onPress={!isPending || connection?.requester_id !== me.id ? handleConnect : undefined}
            loading={actionLoading}
            variant={isAccepted ? 'outline' : 'solid'}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingVertical: 16, paddingBottom: 20 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  catBadge: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  statsRow: {
    flexDirection: 'row', borderRadius: 12,
    padding: 16, marginVertical: 16, borderWidth: 1,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1 },
  infoSection: { borderRadius: 12, overflow: 'hidden', marginBottom: 16, borderWidth: 1 },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1,
  },
  sectionTitle: { marginBottom: 12 },
  ratingCard: {
    borderRadius: 8, padding: 12,
    marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1,
  },
  ratingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingRight: { alignItems: 'flex-end' },
  footer: {
    flexDirection: 'row', paddingHorizontal: screenPadding.horizontal, paddingTop: 16, paddingBottom: 24,
    borderTopWidth: 1,
  },
});
