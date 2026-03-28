import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { profileAPI, socialAPI, ratingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';
import { getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';

export default function PlayerProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: me } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState(null);
  const [connection, setConnection] = useState(null);
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      profileAPI.get(userId),
      ratingsAPI.get(userId),
    ]).then(([pRes, rRes]) => {
      setProfile(pRes.data.user);
      setConnection(pRes.data.connection);
      setRatings(rRes.data.ratings);
    }).catch(console.error).finally(() => setLoading(false));
  }, [userId]);

  async function handleConnect() {
    setActionLoading(true);
    try {
      if (!connection) {
        const res = await socialAPI.connect(userId);
        setConnection(res.data.connection);
        Alert.alert('✅', 'Solicitud enviada');
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
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 60 }}>Cargando...</Text>
      </View>
    );
  }

  const isMine = profile.id === me.id;
  const isAccepted = connection?.status === 'accepted';
  const isPending = connection?.status === 'pending';

  const rank = getRankByTier(profile.category_tier);
  const catColor = rank.starColor || colors.primary;
  const floatingTabBarHeight = 60;
  const floatingTabBarGap = 16;
  const footerBottomOffset = floatingTabBarHeight + floatingTabBarGap + Math.max(insets.bottom, spacing.sm);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: footerBottomOffset + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <Avatar name={profile.name} uri={profile.avatar} size={88} category={rank.name} />
          <Text style={styles.name}>{profile.name}</Text>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
            <Text style={[styles.catText, { color: catColor }]}>{rank.name}</Text>
          </View>
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: rank.starColor }]}>⭐ {profile.stars}</Text>
            <Text style={styles.statLabel}>ESTRELLAS</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.wins}</Text>
            <Text style={styles.statLabel}>Ganados</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.losses}</Text>
            <Text style={styles.statLabel}>Perdidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statValue}>
              {profile.avg_rating > 0 ? `★ ${profile.avg_rating}` : '—'}
            </Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.infoSection}>
          {[
            { icon: '🎾', label: 'Posición', value: profile.position },
            { icon: '🏓', label: 'Paleta', value: profile.paddle_brand },
            { icon: '🏟️', label: 'Cancha fav.', value: profile.favorite_court_id ? `Cancha ${profile.favorite_court_id}` : null },
            { icon: '🤝', label: 'Compañero preferido', value: profile.preferred_partner },
          ].filter((i) => i.value).map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <Text style={styles.infoIcon}>{item.icon}</Text>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Calificaciones */}
        {ratings.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Calificaciones recientes</Text>
            {ratings.slice(0, 5).map((r) => (
              <View key={r.id} style={styles.ratingCard}>
                <View style={styles.ratingLeft}>
                  <Avatar name={r.rater_name} uri={r.rater_avatar} size={32} />
                  <Text style={styles.raterName}>{r.rater_name}</Text>
                </View>
                <View style={styles.ratingRight}>
                  <Text style={styles.ratingStars}>{'★'.repeat(r.score)}{'☆'.repeat(5 - r.score)}</Text>
                  {r.comment && <Text style={styles.ratingComment}>{r.comment}</Text>}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer actions */}
      {!isMine && (
        <View style={[styles.footer, { marginBottom: footerBottomOffset }]}>
          {isAccepted && (
            <Button
              title="💬 Enviar mensaje"
              onPress={() => navigation.navigate('Chat', { connectionId: connection.id, partnerName: profile.name })}
              variant="secondary"
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
            variant={isAccepted ? 'secondary' : 'primary'}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingVertical: spacing.md, paddingBottom: 20 },
  hero: { alignItems: 'center', paddingVertical: 20 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text.primary, marginTop: 14 },
  catBadge: { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  catText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  bio: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 20 },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, marginVertical: 16, borderWidth: 1, borderColor: colors.cardBorder,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '800', color: colors.text.primary },
  statLabel: { fontSize: 11, color: colors.textMuted, marginTop: 3 },
  statDivider: { width: 1, backgroundColor: colors.border },
  infoSection: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden', marginBottom: 16, borderWidth: 1, borderColor: colors.cardBorder },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoIcon: { fontSize: 18, width: 28 },
  infoLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.text.primary, textTransform: 'capitalize' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 12 },
  ratingCard: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 12,
    marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder,
  },
  ratingLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  raterName: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  ratingRight: { alignItems: 'flex-end' },
  ratingStars: { fontSize: 14, color: colors.accent },
  ratingComment: { fontSize: 12, color: colors.textSecondary, marginTop: 2, maxWidth: 150, textAlign: 'right' },
  footer: {
    flexDirection: 'row', paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.md, paddingBottom: 24,
    borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg,
  },
});
