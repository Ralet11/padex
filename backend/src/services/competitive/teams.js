const { MatchPlayer } = require('../../models');
const { RESULT_SIDES } = require('../../constants/domainEvents');

function isCanonicalSide(side) {
  return Object.values(RESULT_SIDES).includes(side);
}

function sortPlayersForCanonicalSides(players = []) {
  return [...players].sort((left, right) => {
    const leftCreatedAt = left?.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightCreatedAt = right?.createdAt ? new Date(right.createdAt).getTime() : 0;
    if (leftCreatedAt !== rightCreatedAt) return leftCreatedAt - rightCreatedAt;

    const leftId = Number(left?.id || left?.user_id || left?.User?.id || 0);
    const rightId = Number(right?.id || right?.user_id || right?.User?.id || 0);
    return leftId - rightId;
  });
}

function getCanonicalSideForIndex(index, maxPlayers = 4) {
  const normalizedMaxPlayers = Math.max(2, Number(maxPlayers) || 4);
  const firstSideSize = Math.ceil(normalizedMaxPlayers / 2);
  return index < firstSideSize ? RESULT_SIDES.A : RESULT_SIDES.B;
}

function getEffectivePlayerSide(player, context = {}) {
  if (isCanonicalSide(player?.team)) {
    return player.team;
  }

  const orderedPlayers = Array.isArray(context.orderedPlayers)
    ? context.orderedPlayers
    : sortPlayersForCanonicalSides(context.players || []);

  const playerId = Number(player?.id || player?.user_id || player?.User?.id || 0);
  const playerIndex = orderedPlayers.findIndex((candidate) => {
    const candidateId = Number(candidate?.id || candidate?.user_id || candidate?.User?.id || 0);
    return candidateId === playerId;
  });

  if (playerIndex === -1) return null;

  return getCanonicalSideForIndex(playerIndex, context.maxPlayers);
}

async function ensureCanonicalTeamsForMatchPlayers(players = [], options = {}) {
  const orderedPlayers = sortPlayersForCanonicalSides(players);
  const patches = orderedPlayers
    .map((player, index) => ({
      player,
      team: getCanonicalSideForIndex(index, options.maxPlayers),
    }))
    .filter(({ player, team }) => !isCanonicalSide(player?.team) || player.team !== team);

  for (const { player, team } of patches) {
    await MatchPlayer.update({ team }, {
      where: { id: player.id },
      transaction: options.transaction,
    });
    player.team = team;
  }

  return orderedPlayers;
}

function inferWinningSideFromWinnerIds(players = [], winners = [], options = {}) {
  const winnerSet = new Set((winners || []).map((value) => Number(value)).filter(Number.isInteger));
  if (winnerSet.size === 0) return null;

  const orderedPlayers = sortPlayersForCanonicalSides(players);
  const winningPlayers = orderedPlayers.filter((player) => winnerSet.has(Number(player?.User?.id || player?.user_id || player?.id)));
  if (winningPlayers.length === 0) return null;

  const winnerSides = [...new Set(winningPlayers.map((player) => getEffectivePlayerSide(player, {
    players,
    orderedPlayers,
    maxPlayers: options.maxPlayers,
  })).filter(Boolean))];

  return winnerSides.length === 1 ? winnerSides[0] : null;
}

module.exports = {
  ensureCanonicalTeamsForMatchPlayers,
  getCanonicalSideForIndex,
  getEffectivePlayerSide,
  inferWinningSideFromWinnerIds,
  isCanonicalSide,
  sortPlayersForCanonicalSides,
};
