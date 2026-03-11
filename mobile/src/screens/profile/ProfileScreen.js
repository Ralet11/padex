import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI, ratingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import MatchCard from '../../components/MatchCard';
import { colors, spacing, radius } from '../../theme';

const CATEGORY_COLORS = {
  principiante: '#6B7280', intermedio: '#3B82F6', avanzado: '#F59E0B', profesional: '#10B981',
};

function EloProgressBar({ elo }) {
  const ranges = [
    { label: 'P', min: 0, max: 900, color: '#6B7280' },
    { label: 'I', min: 900, max: 1100, color: '#3B82F6' },
    { label: 'A', min: 1100, max: 1300, color: '#F59E0B' },
    { label: 'PRO', min: 1300, max: 1700, color: '#10B981' },
  ];
  const total = 1700;
  const clamped = Math.min(elo, total);
  const pct = (clamped / total) * 100;

  return (
    <View style={styles.eloBar}>
      <View style={styles.eloTrack}>
        <View style={[styles.eloFill, { width: `${pct}%`, backgroundColor: CATEGORY_COLORS[elo < 900 ? 'principiante' : elo < 1100 ? 'intermedio' : elo < 1300 ? 'avanzado' : 'profesional'] }]} />
      </View>
      <View style={styles.eloMarkers}>
        {ranges.map((r) => (
          <Text key={r.label} style={[styles.eloMarker, { color: r.color }]}>{r.label}</Text>
        ))}
      </View>
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [myMatches, setMyMatches] = useState([]);
  const [ratingData, setRatingData] = useState({ avg_score: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('historial');

  async function fetchData() {
    try {
      const [matchRes, rateRes] = await Promise.all([
        matchesAPI.my(),
        ratingsAPI.get(user.id),
      ]);
      setMyMatches(matchRes.data.matches);
      setRatingData({ avg_score: rateRes.data.avg_score, total: rateRes.data.total });
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  const catColor = CATEGORY_COLORS[user?.category] || colors.primary;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Mi perfil</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.headerBtnText}>✏️ Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => Alert.alert('¿Cerrar sesión?', '', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: logout },
              ])}
            >
              <Text style={styles.headerBtnText}>👋 Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile hero */}
        <View style={styles.hero}>
          <Avatar name={user?.name} uri={user?.avatar} size={80} category={user?.category} />
          <Text style={styles.name}>{user?.name}</Text>
          <View style={[styles.catBadge, { backgroundColor: catColor + '22' }]}>
            <Text style={[styles.catText, { color: catColor }]}>{user?.category}</Text>
          </View>
        </View>

        {/* ELO */}
        <View style={styles.eloCard}>
          <View style={styles.eloHeader}>
            <Text style={styles.eloTitle}>ELO Rating</Text>
            <Text style={styles.eloValue}>⭐ {user?.elo}</Text>
          </View>
          <EloProgressBar elo={user?.elo || 1000} />
          <Text style={styles.eloHint}>Tu categoría se ajusta automáticamente según tus partidos y calificaciones</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Ganados', value: user?.wins || 0, icon: '🏆', color: colors.success },
            { label: 'Perdidos', value: user?.losses || 0, icon: '💔', color: colors.error },
            { label: 'Rating', value: ratingData.avg_score ? `★ ${ratingData.avg_score}` : '—', icon: '⭐', color: colors.accent },
            { label: 'Partidos', value: myMatches.length, icon: '🎾', color: colors.secondary },
          ].map((s) => (
            <View key={s.label} style={styles.statBox}>
              <Text style={styles.statIcon}>{s.icon}</Text>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Info personal */}
        <View style={styles.infoCard}>
          {[
            { icon: '🎾', label: 'Posición', value: user?.position },
            { icon: '🏓', label: 'Paleta', value: user?.paddle_brand },
            { icon: '🤝', label: 'Compañero preferido', value: user?.preferred_partner },
            { icon: '📋', label: 'Bio', value: user?.bio },
          ].map((item) => item.value ? (
            <View key={item.label} style={styles.infoRow}>
              <Text style={styles.infoIcon}>{item.icon}</Text>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          ) : null)}
        </View>

        {/* Historial */}
        <Text style={styles.sectionTitle}>Mis partidos</Text>
        {myMatches.length === 0 ? (
          <View style={styles.emptyMatches}>
            <Text style={styles.emptyIcon}>🎾</Text>
            <Text style={styles.emptyText}>No jugaste partidos aún</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 90 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  headerTitle: { fontSize: 26, fontWeight: '800', color: colors.text },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: {
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: colors.border,
  },
  headerBtnText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  hero: { alignItems: 'center', paddingVertical: 20 },
  name: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 12 },
  catBadge: { borderRadius: radius.full, paddingHorizontal: 14, paddingVertical: 5, marginTop: 8 },
  catText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },
  eloCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.cardBorder,
  },
  eloHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  eloTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  eloValue: { fontSize: 22, fontWeight: '900', color: colors.accent },
  eloBar: { marginBottom: 8 },
  eloTrack: { height: 8, backgroundColor: colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  eloFill: { height: '100%', borderRadius: 4 },
  eloMarkers: { flexDirection: 'row', justifyContent: 'space-between' },
  eloMarker: { fontSize: 10, fontWeight: '700' },
  eloHint: { fontSize: 11, color: colors.textMuted, marginTop: 6, lineHeight: 16 },
  statsRow: {
    flexDirection: 'row', backgroundColor: colors.card, borderRadius: radius.lg,
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.cardBorder, overflow: 'hidden',
  },
  statBox: { flex: 1, alignItems: 'center', padding: 14 },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 17, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.textMuted, marginTop: 2 },
  infoCard: {
    backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden',
    marginBottom: spacing.md, borderWidth: 1, borderColor: colors.cardBorder,
  },
  infoRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  infoIcon: { fontSize: 18, width: 28 },
  infoLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: colors.text, textTransform: 'capitalize', maxWidth: '50%', textAlign: 'right' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  emptyMatches: { alignItems: 'center', paddingVertical: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary },
});
