require('dotenv').config();

const { Op } = require('sequelize');
const { sequelize, Match, User, Venue } = require('../models');
const {
  DEMO_MATCH_PREFIX,
  TARGET_OPEN_MATCHES,
  ensureDemoVenues,
  ensureDemoPlayers,
  ensureDemoMatches,
} = require('./seedDemoData');
const {
  parseArgs,
  parseInteger,
  printJson,
} = require('./utils/cliArgs');

function printHelp() {
  console.log(`
Uso:
  node src/scripts/createDevMatches.js [opciones]

Opciones:
  --count <numero>                Total objetivo de partidos demo abiertos. Default: ${TARGET_OPEN_MATCHES}
  --help                          Muestra esta ayuda
`);
}

function resolveTargetCount(value) {
  const parsed = parseInteger(value, TARGET_OPEN_MATCHES);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('El count debe ser un entero positivo');
  }

  return parsed;
}

function assertSafeExecution() {
  const normalizedNodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  if (normalizedNodeEnv === 'production') {
    throw new Error('createDevMatches no se ejecuta con NODE_ENV=production');
  }
}

async function createDevMatches(options = {}) {
  const targetOpenMatches = resolveTargetCount(options.count);

  const ensuredVenues = await ensureDemoVenues({ transaction: options.transaction });
  const players = await ensureDemoPlayers({ transaction: options.transaction });
  const matchResult = await ensureDemoMatches(players, ensuredVenues, {
    targetOpenMatches,
    transaction: options.transaction,
  });

  const totalOpenDemoMatches = await Match.count({
    where: {
      status: 'open',
      title: {
        [Op.iLike]: `${DEMO_MATCH_PREFIX}%`,
      },
    },
    transaction: options.transaction,
  });
  const totalDemoPlayers = await User.count({
    where: {
      email: {
        [Op.iLike]: 'demo.player.%@padex.local',
      },
    },
    transaction: options.transaction,
  });
  const totalDemoVenues = await Venue.count({
    where: {
      name: {
        [Op.iLike]: 'Padex Demo -%',
      },
    },
    transaction: options.transaction,
  });

  return {
    target_open_matches: targetOpenMatches,
    ensured_demo_venues: ensuredVenues.length,
    ensured_demo_players: players.length,
    created_open_demo_matches: matchResult.created,
    total_open_demo_matches: totalOpenDemoMatches,
    total_demo_players: totalDemoPlayers,
    total_demo_venues: totalDemoVenues,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  try {
    assertSafeExecution();
    await sequelize.authenticate();
    const result = await createDevMatches({
      count: args.count,
    });
    printJson(result);
  } catch (error) {
    console.error('[dev:matches:create] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  createDevMatches,
};
