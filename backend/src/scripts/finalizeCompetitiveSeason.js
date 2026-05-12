require('dotenv').config();

const { sequelize } = require('../models');
const { finalizeCompetitiveSeason } = require('../services/competitive/seasonLifecycle');
const {
  parseArgs,
  parseBoolean,
  parseInteger,
  printJson,
} = require('./utils/cliArgs');

function printHelp() {
  console.log(`
Uso:
  node src/scripts/finalizeCompetitiveSeason.js [--season-id <id> | --season-key <key>] [opciones]

Opciones:
  --season-id <id>                 Id de la season a cerrar
  --season-key <key>               Key de la season a cerrar
  --league-id <id>                 Liga para resolver active por fallback
  --league-key <key>               Key de liga para resolver active por fallback
  --use-active                     Si no se pasa season-id/key, usa la active actual de la liga
  --ends-at <iso-date>             Fecha de cierre. Default: ahora
  --final-status <completed|archived>
                                   Estado final. Default: completed
  --dry-run                        Ejecuta todo y revierte al final
  --help                           Muestra esta ayuda
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (!args['season-id'] && !args['season-key'] && !parseBoolean(args['use-active'], false)) {
    printHelp();
    process.exit(1);
  }

  const dryRun = parseBoolean(args['dry-run'], false);

  const options = {
    seasonId: parseInteger(args['season-id'], null),
    seasonKey: args['season-key'] || null,
    leagueId: parseInteger(args['league-id'], null),
    leagueKey: args['league-key'] || null,
    allowActiveFallback: parseBoolean(args['use-active'], false),
    endsAt: args['ends-at'] || null,
    finalStatus: args['final-status'] || 'completed',
  };

  try {
    await sequelize.authenticate();

    if (dryRun) {
      const transaction = await sequelize.transaction();

      try {
        const result = await finalizeCompetitiveSeason({
          ...options,
          transaction,
        });
        await transaction.rollback();
        printJson({ dry_run: true, ...result });
        return;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    const result = await finalizeCompetitiveSeason(options);
    printJson(result);
  } catch (error) {
    console.error('[season:finalize] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

main();
