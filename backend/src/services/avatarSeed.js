function hashString(value) {
  const input = String(value || '');
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function pickVariant(seed, salt, modulo) {
  return hashString(`${seed}:${salt}`) % modulo;
}

function generateAvatarSeed(seedInput) {
  const baseSeed = String(seedInput || `${Date.now()}-${Math.random()}`);

  return {
    palette: pickVariant(baseSeed, 'palette', 8),
    composition: pickVariant(baseSeed, 'composition', 7),
    accent: pickVariant(baseSeed, 'accent', 9),
    orbit: pickVariant(baseSeed, 'orbit', 11),
    energy: pickVariant(baseSeed, 'energy', 13),
  };
}

function buildAvatarSeedSource(user = {}) {
  return [
    user.email,
    user.name,
    user.google_sub,
    user.apple_sub,
    user.role,
    user.createdAt,
    Date.now(),
    Math.random(),
  ]
    .filter(Boolean)
    .join('|');
}

function ensureAvatarSeed(user) {
  if (!user) return null;
  if (user.avatar_seed && typeof user.avatar_seed === 'object') return user.avatar_seed;

  const nextSeed = generateAvatarSeed(buildAvatarSeedSource(user));
  user.avatar_seed = nextSeed;
  return nextSeed;
}

module.exports = {
  generateAvatarSeed,
  ensureAvatarSeed,
};
