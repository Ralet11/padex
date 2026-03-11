const K = 32;

function getExpected(playerElo, opponentElo) {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

function updateElo(playerElo, opponentElo, won) {
  const expected = getExpected(playerElo, opponentElo);
  const actual = won ? 1 : 0;
  return Math.round(playerElo + K * (actual - expected));
}

function categoryFromElo(elo) {
  if (elo < 900) return 'principiante';
  if (elo < 1100) return 'intermedio';
  if (elo < 1300) return 'avanzado';
  return 'profesional';
}

function eloFromSelfCategory(category) {
  const map = {
    principiante: 800,
    intermedio: 1000,
    avanzado: 1200,
    profesional: 1500,
  };
  return map[category] || 1000;
}

// Adjust ELO based on rating received (1-5 stars)
// score 5 → small elo boost, score 1 → small elo drop
function eloAdjustFromRating(score) {
  const adjustments = { 1: -8, 2: -4, 3: 0, 4: 4, 5: 8 };
  return adjustments[score] || 0;
}

module.exports = { updateElo, categoryFromElo, eloFromSelfCategory, eloAdjustFromRating };
