import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { matchesAPI, ratingsAPI, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import Avatar from '../../components/Avatar';
import Button from '../../components/Button';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';

const STATUS_CONFIG = {
  open: { label: 'Abierto', color: '#A7CE29' },
  reserved: { label: 'Reservado', color: '#F59E0B' },
  completed: { label: 'Finalizado', color: '#A1A1AA' },
  cancelled: { label: 'Cancelado', color: '#EF4444' },
};

function getPlayerPrice(totalCourtPrice, orderIndex) {
  const basePrice = Number(totalCourtPrice || 0) / 4;
  return Math.round(basePrice + (orderIndex * 2000));
}

async function openVenueMap(match) {
  const query = [match?.venue_name, match?.venue_address].filter(Boolean).join(' ');
  if (!query) {
    Alert.alert('Mapa no disponible', 'Esta sede no tiene direccion cargada.');
    return;
  }

  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  try {
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('Error', 'No se pudo abrir el mapa.');
  }
}

function StarRating({ value, onRate, colors }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity key={s} onPress={() => onRate(s)}>
          <Feather
            name="star"
            size={32}
            color={colors.text.primary}
            style={{ opacity: s <= value ? 1 : 0.2 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PlayerQuadrant({ player, colors, isCreator }) {
  return (
    <View style={[styles.playerRowCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
      <View style={styles.playerRowMain}>
        <Avatar name={player.name} uri={player.avatar} size={52} category={player.category} />
        <View style={styles.playerRowInfo}>
          <View style={styles.playerRowTitle}>
            <Text style={[typography.bodyBold, { color: colors.text.primary, flex: 1 }]} numberOfLines={1}>
              {player.name}
            </Text>
            {isCreator && (
              <View style={[styles.creatorPill, { backgroundColor: colors.surfaceHighlight }]}>
                <Feather name="star" size={11} color={colors.accent} />
                <Text style={[styles.creatorPillText, { color: colors.text.primary }]}>Creador</Text>
              </View>
            )}
          </View>
          <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={1}>
            {getRankByTier(player.category).name}
          </Text>
        </View>
      </View>
    </View>
  );
}

function EmptyQuadrant({ colors, joinPrice, onJoin, showJoin, isInMatch }) {
  if (showJoin) {
    return (
      <TouchableOpacity
        style={[styles.emptySlotCard, styles.joinSlotCard, { borderColor: colors.text.primary, backgroundColor: colors.surfaceHighlight }]}
        activeOpacity={0.85}
        onPress={onJoin}
      >
        <View style={styles.emptySlotHeader}>
          <View style={[styles.emptySlotIcon, { backgroundColor: colors.text.primary }]}>
            <Feather name="plus" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Sumarte ahora</Text>
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
              Tomas el proximo lugar disponible
            </Text>
          </View>
        </View>
        <View style={styles.emptySlotFooter}>
          <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>PRECIO</Text>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
            ${joinPrice.toLocaleString('es-AR')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.emptySlotCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
      <View style={styles.emptySlotHeader}>
        <View style={[styles.emptySlotIconMuted, { borderColor: colors.borderLight, backgroundColor: colors.background }]}>
          <Feather name="user-plus" size={16} color={colors.text.tertiary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
            {isInMatch ? 'Vacante' : 'Lugar libre'}
          </Text>
          <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
            {isInMatch ? 'Todavia falta un jugador para completar el partido' : 'Disponible para el proximo jugador'}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function MatchDetailScreen({ route, navigation }) {
  const { matchId } = route.params;
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

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

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  const isInMatch = match?.players?.some((p) => p.id === user.id);
  const isFull = (match?.players?.length || 0) >= (match?.max_players || 4);
  const isCreator = match?.creator_id === user.id;

  async function handleJoin() {
    setActionLoading(true);
    try {
      const res = await matchesAPI.join(matchId);
      setMatch(res.data.match);
      if (res.data.match.status === 'reserved') {
        Alert.alert('Partido reservado', 'Este partido completo el cupo y se quedo con el turno.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    Alert.alert('Salir del partido', 'Perderas tu lugar', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
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
      Alert.alert('Calificado', 'Gracias por tu feedback.');
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  }

  const orderedPlayers = useMemo(() => (
    [...(match?.players || [])]
      .sort((a, b) => new Date(a.joined_at || 0) - new Date(b.joined_at || 0))
  ), [match]);

  if (loading || !match) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center' }]}>
        <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>Cargando...</Text>
      </View>
    );
  }

  const status = STATUS_CONFIG[match.status] || STATUS_CONFIG.open;
  const venueImage = resolveAssetUrl(match.venue_image);
  const date = new Date(`${match.date}T${match.time}`);
  const dayStr = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalValue = Number(match.price || 0);
  const myPlayerIndex = orderedPlayers.findIndex((player) => player.id === user.id);
  const currentDisplayedValue = getPlayerPrice(totalValue, myPlayerIndex >= 0 ? myPlayerIndex : Math.max(orderedPlayers.length, 0));

  const maxPlayers = match?.max_players || 4;
  const quadrants = Array.from({ length: maxPlayers }, (_, index) => orderedPlayers[index] || null);
  const joinQuadrantIndex = quadrants.findIndex((item) => item === null);
  const showActionSection = (isInMatch && match.status !== 'completed') || (isCreator && match.status === 'reserved');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 88 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
          <View style={styles.heroMedia}>
            {venueImage ? (
              <Image source={{ uri: venueImage }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <View style={[styles.heroImage, { backgroundColor: colors.surfaceHighlight, alignItems: 'center', justifyContent: 'center' }]}>
                <Feather name="image" size={28} color={colors.text.tertiary} />
              </View>
            )}
            <View style={styles.heroOverlay}>
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: colors.surface }]}
                onPress={() => navigation.goBack()}
                activeOpacity={0.85}
              >
                <Feather name="arrow-left" size={18} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={[styles.statusChip, { backgroundColor: status.color }]}>
                <Text style={styles.statusChipText}>{status.label}</Text>
              </View>
            </View>
          </View>

          <View style={styles.heroBody}>
            <Text style={[typography.h2, { color: colors.text.primary }]}>{match.title || 'Partido de padel'}</Text>
            <Text style={[typography.body, { color: colors.text.secondary, marginTop: 2 }]}>{match.venue_name}</Text>
            {match.venue_address ? (
              <TouchableOpacity
                style={[styles.addressCard, { backgroundColor: colors.surfaceHighlight }]}
                activeOpacity={0.8}
                onPress={() => openVenueMap(match)}
              >
                <Feather name="map-pin" size={14} color={colors.text.tertiary} />
                <Text style={[typography.caption, { color: colors.text.secondary, marginLeft: 8, flex: 1 }]}>
                  {match.venue_address}
                </Text>
                <Feather name="external-link" size={14} color={colors.text.tertiary} />
              </TouchableOpacity>
            ) : null}

            <View style={styles.heroMetaGrid}>
              <View style={[styles.metaCard, { backgroundColor: colors.surfaceHighlight }]}>
                <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>CUANDO</Text>
                <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 4, textTransform: 'capitalize' }]}>
                  {dayStr}
                </Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                  {match.time?.slice(0, 5)} · {match.duration} min
                </Text>
              </View>

              <View style={[styles.metaCard, { backgroundColor: colors.surfaceHighlight }]}>
                <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>VALOR</Text>
                <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 4 }]}>
                  ${currentDisplayedValue.toLocaleString('es-AR')}
                </Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                  {myPlayerIndex >= 0 ? 'tu precio' : 'precio para sumarte'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[typography.h3, { color: colors.text.primary }]}>Jugadores</Text>
          <Text style={[typography.caption, { color: colors.text.secondary }]}>Ves quienes ya confirmaron y los lugares que faltan</Text>
        </View>

        <View style={styles.playersList}>
          {quadrants.map((player, index) => {
            if (player) {
              return (
                <PlayerQuadrant
                  key={player.id}
                  player={player}
                  colors={colors}
                  isCreator={player.id === match.creator_id}
                />
              );
            }

            return (
              <EmptyQuadrant
                key={`empty-${index}`}
                colors={colors}
                joinPrice={getPlayerPrice(totalValue, index)}
                onJoin={handleJoin}
                showJoin={index === joinQuadrantIndex && match.status === 'open' && !isInMatch && !isFull}
                isInMatch={isInMatch}
              />
            );
          })}
        </View>

        {match.status === 'completed' && (
          <View style={styles.sectionHeader}>
            <Text style={[typography.h3, { color: colors.text.primary }]}>Calificaciones</Text>
          </View>
        )}

        {match.status === 'completed' && match.players?.map((player) => (
          player.id !== user.id ? (
            <View key={`rating-${player.id}`} style={[styles.ratingRow, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
              <View style={styles.ratingPlayerInfo}>
                <Avatar name={player.name} uri={player.avatar} size={42} category={player.category} />
                <View style={{ marginLeft: spacing.md }}>
                  <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{player.name}</Text>
                  <Text style={[typography.caption, { color: colors.text.secondary }]}>
                    {getRankByTier(player.category).name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setRatingPlayer(ratingPlayer === player.id ? null : player.id)}>
                <Text style={[typography.captionMedium, { color: colors.text.primary }]}>Calificar</Text>
              </TouchableOpacity>
            </View>
          ) : null
        ))}

        {ratingPlayer && (
          <View style={[styles.ratingPanel, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}>
            <Text style={[typography.subtitle, { color: colors.text.primary, marginBottom: spacing.md }]}>Califica a este jugador</Text>
            <StarRating value={ratingScore} onRate={setRatingScore} colors={colors} />
            <Button title="Confirmar calificacion" onPress={handleRate} style={{ marginTop: spacing.lg, width: '100%' }} />
          </View>
        )}

        {showActionSection ? (
          <View style={[styles.actionSection, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}>
            {isInMatch && match.status !== 'completed' && (
              <Button title="Darse de baja" onPress={handleLeave} loading={actionLoading} variant="danger" size="lg" />
            )}
            {isCreator && match.status === 'reserved' && (
              <Button
                title="Finalizar partido"
                onPress={async () => {
                  await matchesAPI.complete(matchId);
                  fetchMatch();
                }}
                variant="secondary"
                size="lg"
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.md,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  heroMedia: {
    height: 64,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusChipText: {
    color: '#111',
    fontWeight: '800',
    fontSize: 12,
  },
  heroBody: {
    padding: spacing.sm,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    marginTop: spacing.sm,
  },
  heroMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 8,
    marginTop: spacing.sm,
  },
  metaCard: {
    flex: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  playersList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  playerRowCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.md,
  },
  playerRowInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  playerRowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  creatorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creatorPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  playerRowMeta: {
    alignItems: 'flex-end',
    minWidth: 84,
  },
  emptySlotCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
  },
  joinSlotCard: {
    borderStyle: 'solid',
  },
  emptySlotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  emptySlotIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptySlotIconMuted: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  emptySlotFooter: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderStyle: 'dashed',
  },
  ratingRow: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingPlayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingPanel: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionSection: {
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
});
