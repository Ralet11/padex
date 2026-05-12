function parseArgs(argv = []) {
  const args = {};

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (!current.startsWith('--')) continue;

    const withoutPrefix = current.slice(2);
    const equalsIndex = withoutPrefix.indexOf('=');

    if (equalsIndex >= 0) {
      const key = withoutPrefix.slice(0, equalsIndex);
      const value = withoutPrefix.slice(equalsIndex + 1);
      args[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      args[withoutPrefix] = next;
      index += 1;
      continue;
    }

    args[withoutPrefix] = true;
  }

  return args;
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'undefined') return fallback;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return fallback;

  if (['1', 'true', 'yes', 'y', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(normalized)) return false;

  return fallback;
}

function parseInteger(value, fallback = null) {
  if (value === null || typeof value === 'undefined' || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : fallback;
}

function printJson(value) {
  console.log(JSON.stringify(value, null, 2));
}

module.exports = {
  parseArgs,
  parseBoolean,
  parseInteger,
  printJson,
};
