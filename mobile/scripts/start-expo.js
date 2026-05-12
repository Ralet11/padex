const { spawn } = require('node:child_process');
const os = require('node:os');
const path = require('node:path');

function isIpv4Family(family) {
  return family === 'IPv4' || family === 4;
}

function scoreAddress(address) {
  if (address.startsWith('192.168.')) {
    return 4;
  }

  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(address)) {
    return 3;
  }

  if (address.startsWith('10.')) {
    return 2;
  }

  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(address)) {
    return 1;
  }

  return 0;
}

function getPreferredLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    for (const addressInfo of addresses || []) {
      if (!isIpv4Family(addressInfo.family) || addressInfo.internal || !addressInfo.address) {
        continue;
      }

      candidates.push({
        name,
        address: addressInfo.address,
        score: scoreAddress(addressInfo.address),
      });
    }
  }

  candidates.sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  return candidates[0]?.address || null;
}

const env = { ...process.env };

if (!env.REACT_NATIVE_PACKAGER_HOSTNAME) {
  const detectedIp = getPreferredLanIp();

  if (detectedIp) {
    env.REACT_NATIVE_PACKAGER_HOSTNAME = detectedIp;
    console.log(`[expo-host] Using LAN IP ${detectedIp}`);
  } else {
    console.warn('[expo-host] Could not detect a LAN IPv4 address. Expo may fall back to localhost.');
  }
}

const expoCli = path.join(__dirname, '..', 'node_modules', 'expo', 'bin', 'cli');
const child = spawn(process.execPath, [expoCli, 'start', ...process.argv.slice(2)], {
  cwd: path.join(__dirname, '..'),
  env,
  stdio: 'inherit',
});

child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});
