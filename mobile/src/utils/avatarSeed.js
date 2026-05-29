function hashString(value) {
  const input = String(value || '');
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function variantFromSeed(seed, salt, modulo) {
  return hashString(`${seed}:${salt}`) % modulo;
}

export function normalizeAvatarSeed(seed, fallbackKey = '') {
  if (seed && typeof seed === 'object') {
    return {
      palette: Number(seed.palette ?? 0) % 8,
      composition: Number(seed.composition ?? 0) % 7,
      accent: Number(seed.accent ?? 0) % 9,
      orbit: Number(seed.orbit ?? 0) % 11,
      energy: Number(seed.energy ?? 0) % 13,
    };
  }

  const baseSeed = String(fallbackKey || 'padex-avatar');
  return {
    palette: variantFromSeed(baseSeed, 'palette', 8),
    composition: variantFromSeed(baseSeed, 'composition', 7),
    accent: variantFromSeed(baseSeed, 'accent', 9),
    orbit: variantFromSeed(baseSeed, 'orbit', 11),
    energy: variantFromSeed(baseSeed, 'energy', 13),
  };
}
