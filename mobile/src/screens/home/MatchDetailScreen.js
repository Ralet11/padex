import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Image, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { matchesAPI, ratingsAPI, resolveAssetUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import { Avatar, Button, Skeleton, InlineError } from '../../components/ui';
import { radius, spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { getRankByTier } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';
import { getCompetitiveTier, getMatchState, MATCH_STATES } from '../../utils/domain';

function getStatusConfig(colors) {
  return {
    [MATCH_STATES.OPEN]: { label: 'Abierto', color: colors.success },
    [MATCH_STATES.RESERVED]: { label: 'Reservado', color: colors.warning },
    [MATCH_STATES.IN_PROGRESS]: { label: 'En juego', color: colors.info },
    [MATCH_STATES.COMPLETED]: { label: 'Finalizado', color: colors.text.tertiary },
    [MATCH_STATES.CANCELLED]: { label: 'Cancelado', color: colors.danger },
    [MATCH_STATES.DRAFT]: { label: 'Borrador', color: colors.text.secondary },
  };
}

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
        <TouchableOpacity key={s} onPress={() => onRate(s)} accessibilityLabel={`${s} estrella${s > 1 ? 's' : ''}`} accessibilityRole="button">
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
  const rank = getRankByTier(getCompetitiveTier(player));
  return (
    <View style={[styles.playerRowCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}> 
      <View style={styles.playerRowMain}>
        <Avatar name={player.name} uri={player.avatar} size={52} category={rank.name} />
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
            {rank.name}
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
        accessibilityLabel={`Sumarte al partido por $${joinPrice.toLocaleString('es-AR')}`}
        accessibilityRole="button"
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
  const [winnerIds, setWinnerIds] = useState([]);
  const [error, setError] = useState(null);

  async function fetchMatch() {
    setError(null);
    try {
      const res = await matchesAPI.get(matchId);
      setMatch(res.data.match);
    } catch (err) {
      setError(err.message || 'No se pudo cargar el partido');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMatch();
  }, [matchId]);

  useEffect(() => {
    if (!Array.isArray(match?.players)) {
      setWinnerIds([]);
      return;
    }

    setWinnerIds(
      match.players
        .filter((player) => player.competitive_result === 'win')
        .map((player) => player.id)
    );
  }, [match?.players]);

  const isInMatch = match?.players?.some((p) => p.id === user.id);
  const isFull = (match?.players?.length || 0) >= (match?.max_players || 4);
  const isCreator = match?.creator_id === user.id;

  async function handleJoin() {
    setActionLoading(true);
    try {
      const res = await matchesAPI.join(matchId);
      setMatch(res.data.match);
      if (getMatchState(res.data.match) === MATCH_STATES.RESERVED) {
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

  function toggleWinner(playerId) {
    setWinnerIds((current) => (
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId]
    ));
  }

  function inferWinningSideFromSelection(players, selectedWinnerIds) {
    if (!Array.isArray(players) || selectedWinnerIds.length === 0) return null;

    const winnerSet = new Set(selectedWinnerIds);
    const winners = players.filter((player) => winnerSet.has(player.id));
    if (winners.length === 0) return null;

    const winnerTeams = [...new Set(winners.map((player) => player.team).filter(Boolean))];
    return winnerTeams.length === 1 ? winnerTeams[0] : null;
  }

  async function handleComplete() {
    if (winnerIds.length === 0 || winnerIds.length === (match?.players?.length || 0)) {
      Alert.alert('Resultado incompleto', 'Marca a los jugadores ganadores antes de finalizar el partido.');
      return;
    }

    const winningSide = inferWinningSideFromSelection(match?.players || [], winnerIds);
    const allPlayersHaveCanonicalTeams = (match?.players || []).every((player) => player?.team);
    if (allPlayersHaveCanonicalTeams && !winningSide) {
      Alert.alert('Resultado inválido', 'Los ganadores deben pertenecer al mismo lado del partido.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await matchesAPI.complete(matchId, {
        winners: winnerIds,
        source: 'mobile',
        result: winningSide
          ? {
              winning_side: winningSide,
              source: 'mobile',
            }
          : undefined,
      });
      setMatch(res.data.match);
      Alert.alert('Resultado registrado', 'El partido se cerró y se actualizaron los perfiles competitivos.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const orderedPlayers = useMemo(() => (
    [...(match?.players || [])]
      .sort((a, b) => new Date(a.joined_at || 0) - new Date(b.joined_at || 0))
  ), [match]);

  if (loading || !match) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.xl }]}>
        <Skeleton height={64} width="100%" radius={radius.xl} style={{ marginBottom: spacing.md }} />
        <Skeleton height={24} width="70%" style={{ marginBottom: spacing.sm }} />
        <Skeleton height={16} width="50%" style={{ marginBottom: spacing.xl }} />
        <Skeleton height={80} width="100%" style={{ marginBottom: spacing.sm }} />
        <Skeleton height={80} width="100%" style={{ marginBottom: spacing.sm }} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.xxl }]}>
        <InlineError message={error} onRetry={fetchMatch} />
      </View>
    );
  }

  const matchState = getMatchState(match);
  const statusConfig = getStatusConfig(colors);
  const status = statusConfig[matchState] || statusConfig[MATCH_STATES.OPEN];
  const venueImage = resolveAssetUrl(match.venue_image);
  const date = new Date(`${match.date}T${match.time}`);
  const dayStr = date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalValue = Number(match.price || 0);
  const myPlayerIndex = orderedPlayers.findIndex((player) => player.id === user.id);
  const currentDisplayedValue = getPlayerPrice(totalValue, myPlayerIndex >= 0 ? myPlayerIndex : Math.max(orderedPlayers.length, 0));

  const maxPlayers = match?.max_players || 4;
  const quadrants = Array.from({ length: maxPlayers }, (_, index) => orderedPlayers[index] || null);
  const joinQuadrantIndex = quadrants.findIndex((item) => item === null);
  const showActionSection = (isInMatch && matchState !== MATCH_STATES.COMPLETED) || (isCreator && matchState === MATCH_STATES.RESERVED);
  const canSubmitResult = winnerIds.length > 0 && winnerIds.length < orderedPlayers.length;

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
                accessibilityLabel="Volver"
                accessibilityRole="button"
              >
                <Feather name="arrow-left" size={18} color={colors.text.primary} />
              </TouchableOpacity>
              <View style={[styles.statusChip, { backgroundColor: status.color }]}>
                <Text style={[styles.statusChipText, { color: colors.text.inverse }]}>{status.label}</Text>
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
                accessibilityLabel={`Abrir mapa: ${match.venue_address}`}
                accessibilityRole="button"
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
                showJoin={index === joinQuadrantIndex && matchState === MATCH_STATES.OPEN && !isInMatch && !isFull}
                isInMatch={isInMatch}
              />
            );
          })}
        </View>

        {matchState === MATCH_STATES.COMPLETED && (
          <View style={[styles.resultSummaryCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}> 
            <Text style={[typography.h3, { color: colors.text.primary }]}>Resultado competitivo</Text>
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]}> 
              {match.canonical_completion?.score?.length
                ? match.canonical_completion.score.map((setScore) => `${setScore.a}-${setScore.b}`).join(' · ')
                : 'Resultado registrado sin score detallado'}
            </Text>
          </View>
        )}

        {matchState === MATCH_STATES.COMPLETED && (
          <View style={styles.sectionHeader}>
            <Text style={[typography.h3, { color: colors.text.primary }]}>Calificaciones</Text>
          </View>
        )}

        {matchState === MATCH_STATES.COMPLETED && match.players?.map((player) => (
          player.id !== user.id ? (
            <View key={`rating-${player.id}`} style={[styles.ratingRow, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}> 
              <View style={styles.ratingPlayerInfo}>
                <Avatar name={player.name} uri={player.avatar} size={42} category={getRankByTier(getCompetitiveTier(player)).name} />
                <View style={{ marginLeft: spacing.md }}>
                  <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{player.name}</Text>
                  <Text style={[typography.caption, { color: colors.text.secondary }]}> 
                    {getRankByTier(getCompetitiveTier(player)).name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setRatingPlayer(ratingPlayer === player.id ? null : player.id)} accessibilityLabel={`Calificar a ${player.name}`} accessibilityRole="button">
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

        {isCreator && matchState === MATCH_STATES.RESERVED ? (
          <View style={[styles.resultEditorCard, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}> 
            <Text style={[typography.h3, { color: colors.text.primary }]}>Registrar resultado</Text>
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]}>Toca a los ganadores para enviar el cierre competitivo canonizado.</Text>
            <View style={styles.resultWinnersGrid}>
              {orderedPlayers.map((player) => {
                const selected = winnerIds.includes(player.id);
                return (
                  <TouchableOpacity
                    key={`winner-${player.id}`}
                    activeOpacity={0.82}
                    onPress={() => toggleWinner(player.id)}
                    accessibilityLabel={`${selected ? 'Quitar' : 'Marcar'} a ${player.name} como ganador`}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[
                      styles.winnerChip,
                      {
                        borderColor: selected ? colors.text.primary : colors.borderLight,
                        backgroundColor: selected ? colors.surfaceHighlight : colors.background,
                      },
                    ]}
                  >
                    <Text style={[typography.captionMedium, { color: colors.text.primary }]} numberOfLines={1}>{player.name}</Text>
                    <Text style={[typography.caption, { color: colors.text.secondary }]}>{selected ? 'Ganador' : 'Pendiente'}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : null}

        {showActionSection ? (
          <View style={[styles.actionSection, { borderColor: colors.borderLight, backgroundColor: colors.surface }]}> 
            {isInMatch && matchState !== MATCH_STATES.COMPLETED && (
              <Button title="Darse de baja" onPress={handleLeave} loading={actionLoading} variant="danger" size="lg" />
            )}
            {isCreator && matchState === MATCH_STATES.RESERVED && (
              <Button
                title={canSubmitResult ? 'Finalizar partido' : 'Seleccioná ganadores'}
                onPress={handleComplete}
                loading={actionLoading}
                variant="outline"
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  statusChipText: {
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
  resultSummaryCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultEditorCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  resultWinnersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  winnerChip: {
    flexBasis: '48%',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    gap: 4,
  },
  actionSection: {
    borderRadius: radius.xl,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
  },
});
