import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI, ratingsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { colors, spacing, radius } from '../../theme';

const STATUS_CONFIG = {
  open: { label: 'Abierto', color: colors.primary },
  reserved: { label: 'Reservado ✓', color: colors.accent },
  completed: { label: 'Finalizado', color: colors.textMuted },
  cancelled: { label: 'Cancelado', color: colors.error },
};

function StarRating({ value, onRate }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onRate(s)}>
          <Text style={{ fontSize: 28, opacity: s <= value ? 1 : 0.3 }}>⭐</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function MatchDetailScreen({ route, navigation }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [ratingPlayer, setRatingPlayer] = useState(null);
  const [ratingScore, setRatingScore] = useState(3);

  async function fetchMatch() {
    try {
      const res = await matchesAPI.get(matchId);
      setMatch(res.data.match);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMatch(); }, [matchId]);

  const isInMatch = match?.players?.some((p) => p.id === user.id);
  const isFull = match?.players?.length >= match?.max_players;
  const isCreator = match?.creator_id === user.id;

  async function handleJoin() {
    setActionLoading(true);
    try {
      const res = await matchesAPI.join(matchId);
      setMatch(res.data.match);
      if (res.data.match.status === 'reserved') {
        Alert.alert('🎉 ¡Partido reservado!', 'Se notificó a la cancha vía WhatsApp. ¡A jugar!');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    Alert.alert('¿Salir del partido?', 'Perderás tu lugar', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive', onPress: async () => {
          setActionLoading(true);
          try {
            await matchesAPI.leave(matchId);
            navigation.goBack();
          } catch (err) {
            Alert.alert('Error', err.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }

  async function handleRate() {
    if (!ratingPlayer || !ratingScore) return;
    try {
      await ratingsAPI.rate({ rated_id: ratingPlayer, match_id: matchId, score: ratingScore });
      setRatingPlayer(null);
      Alert.alert('✅', 'Calificación enviada');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  if (loading || !match) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 60 }}>Cargando...</Text>
      </View>
    );
  }

  const status = STATUS_CONFIG[match.status] || STATUS_CONFIG.open;
  const date = new Date(`${match.date}T${match.time}`);
  const dayStr = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: status.color + '22' }]}>
          <View style={[styles.statusDot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{match.title || 'Partido de padel'}</Text>
        {match.description ? <Text style={styles.desc}>{match.description}</Text> : null}

        {/* Info cards */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🏟️</Text>
            <Text style={styles.infoLabel}>Cancha</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{match.court_name}</Text>
            <Text style={styles.infoSub} numberOfLines={1}>{match.court_address}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📅</Text>
            <Text style={styles.infoLabel}>Fecha y hora</Text>
            <Text style={styles.infoValue}>{dayStr}</Text>
            <Text style={styles.infoSub}>{match.time?.slice(0, 5)} — {match.duration} min</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>💰</Text>
            <Text style={styles.infoLabel}>Precio</Text>
            <Text style={styles.infoValue}>${match.price?.toLocaleString('es-AR')}</Text>
            <Text style={styles.infoSub}>por persona</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>👥</Text>
            <Text style={styles.infoLabel}>Jugadores</Text>
            <Text style={styles.infoValue}>{match.players?.length}/{match.max_players}</Text>
            <Text style={styles.infoSub}>mínimo {match.min_players}</Text>
          </View>
        </View>

        {/* Players */}
        <Text style={styles.sectionTitle}>Jugadores</Text>
        {match.players?.map((player) => (
          <View key={player.id} style={styles.playerRow}>
            <Avatar name={player.name} uri={player.avatar} size={44} category={player.category} />
            <View style={styles.playerInfo}>
              <Text style={styles.playerName}>
                {player.name}
                {player.id === match.creator_id && <Text style={styles.creatorBadge}> 👑</Text>}
              </Text>
              <Text style={styles.playerMeta}>{player.category} · {player.elo} ELO · {player.position}</Text>
            </View>
            {match.status === 'completed' && player.id !== user.id && (
              <TouchableOpacity
                style={styles.rateBtn}
                onPress={() => setRatingPlayer(ratingPlayer === player.id ? null : player.id)}
              >
                <Text style={styles.rateBtnText}>⭐ Calificar</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}

        {/* Rating panel */}
        {ratingPlayer && (
          <View style={styles.ratingPanel}>
            <Text style={styles.ratingTitle}>Calificar jugador</Text>
            <StarRating value={ratingScore} onRate={setRatingScore} />
            <Button title="Enviar calificación" onPress={handleRate} style={{ marginTop: 12 }} size="sm" />
          </View>
        )}

        {/* Spots left */}
        {match.status === 'open' && (
          <View style={styles.spotsBar}>
            {Array.from({ length: match.max_players }).map((_, i) => (
              <View
                key={i}
                style={[styles.spot, i < match.players?.length ? styles.spotFilled : styles.spotEmpty]}
              />
            ))}
            <Text style={styles.spotsText}>
              {match.max_players - (match.players?.length || 0)} lugar(es) disponible(s)
            </Text>
          </View>
        )}
      </ScrollView>

      {/* CTA footer */}
      <View style={styles.footer}>
        {match.status === 'open' && !isInMatch && !isFull && (
          <Button title="Unirme al partido" onPress={handleJoin} loading={actionLoading} size="lg" style={styles.cta} />
        )}
        {isInMatch && match.status !== 'completed' && (
          <Button title="Salir del partido" onPress={handleLeave} loading={actionLoading} variant="danger" size="lg" style={styles.cta} />
        )}
        {isCreator && match.status === 'reserved' && (
          <Button
            title="Marcar como finalizado"
            onPress={async () => {
              await matchesAPI.complete(matchId);
              fetchMatch();
            }}
            variant="secondary"
            size="lg"
            style={styles.cta}
          />
        )}
        {isFull && !isInMatch && <Text style={styles.fullText}>Este partido está completo</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.md, paddingBottom: 20 },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.full,
    alignSelf: 'flex-start', marginBottom: 12,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontWeight: '700', fontSize: 13 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginBottom: 6 },
  desc: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.lg },
  infoCard: {
    width: '47%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: 14, borderWidth: 1, borderColor: colors.cardBorder,
  },
  infoIcon: { fontSize: 20, marginBottom: 4 },
  infoLabel: { fontSize: 11, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.text },
  infoSub: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: radius.md,
    padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.cardBorder,
  },
  playerInfo: { flex: 1, marginLeft: 12 },
  playerName: { fontSize: 14, fontWeight: '700', color: colors.text },
  creatorBadge: { fontSize: 12 },
  playerMeta: { fontSize: 12, color: colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  rateBtn: { backgroundColor: colors.accentBg, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  rateBtnText: { fontSize: 12, color: colors.accent, fontWeight: '700' },
  ratingPanel: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: 16,
    marginVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder,
  },
  ratingTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },
  spotsBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 4 },
  spot: { flex: 1, height: 6, borderRadius: 3 },
  spotFilled: { backgroundColor: colors.primary },
  spotEmpty: { backgroundColor: colors.border },
  spotsText: { fontSize: 12, color: colors.textSecondary, width: 130 },
  footer: {
    padding: spacing.md, paddingBottom: 24, borderTopWidth: 1, borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  cta: { width: '100%' },
  fullText: { textAlign: 'center', color: colors.textSecondary, fontSize: 14, paddingVertical: 8 },
});
