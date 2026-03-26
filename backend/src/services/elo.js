// Start with 7ma and go up to 1ra
const CATEGORY_TIERS = {
  7: { name: '7ma', minStars: 0, maxStars: 400 },
  6: { name: '6ta', minStars: 401, maxStars: 800 },
  5: { name: '5ta', minStars: 801, maxStars: 1200 },
  4: { name: '4ta', minStars: 1201, maxStars: 1600 },
  3: { name: '3ra', minStars: 1601, maxStars: 2000 },
  2: { name: '2da', minStars: 2001, maxStars: 2400 },
  1: { name: '1ra (Experto)', minStars: 2401, maxStars: 99999 },
};

function categoryFromStars(stars) {
  for (let i = 7; i >= 1; i--) {
    if (stars <= CATEGORY_TIERS[i].maxStars) {
      return i;
    }
  }
  return 1;
}

function nameFromTier(tier) {
  return CATEGORY_TIERS[tier]?.name || 'Desconocido';
}

function starsFromSelfCategory(categoryName) {
  // Return the midpoint of the category
  const map = {
    '7ma': 200,
    '6ta': 600,
    '5ta': 1000,
    '4ta': 1400,
    '3ra': 1800,
    '2da': 2200,
    '1ra': 2600
  };
  return map[categoryName] || 200; // default to 7ma
}

// Upset Multiplier Logic
// Calculate stars to award based on the tier differences
function calculateStarsEarned(myTeamAvgTier, opponentTeamAvgTier, result) {
  const baseWin = 30;
  const baseLoss = -15;
  const upsetMultiplier = 15;

  // Higher tier number means WORSE player (7 = beginner, 1 = pro)
  // Positive delta means we are worse than them (we deserve more points if we win)
  // Negative delta means we are better than them (we deserve less points if we win)
  const tierDelta = myTeamAvgTier - opponentTeamAvgTier;

  if (result === 'win') {
    // We won. Did we pull off an upset? (We were lower rank)
    if (tierDelta > 0) {
      return baseWin + (tierDelta * upsetMultiplier); // e.g. +45, +60
    }
    // We won. Were we favored? (We were higher rank)
    if (tierDelta < 0) {
      return Math.max(5, baseWin + (tierDelta * (upsetMultiplier / 2))); // Floor at +5 stars
    }
    return baseWin;
  } else if (result === 'loss') {
    // We lost. Did we get upset? (We were higher rank)
    if (tierDelta < 0) {
      return baseLoss + (tierDelta * upsetMultiplier); // e.g. -30, -45
    }
    // We lost. Were we supposed to lose? (We were lower rank)
    if (tierDelta > 0) {
      return Math.min(-5, baseLoss + (tierDelta * (upsetMultiplier / 2))); // Cap at -5 stars
    }
    return baseLoss;
  }

  return 0; // 'draw'
}

module.exports = {
  categoryFromStars,
  nameFromTier,
  starsFromSelfCategory,
  calculateStarsEarned
};
