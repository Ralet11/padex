require('dotenv').config();

const { sequelize } = require('../models');
const { rolloverCompetitiveSeason } = require('../services/competitive/seasonLifecycle');
const {
  parseArgs,
  parseBoolean,
  parseInteger,
  printJson,
} = require('./utils/cliArgs');

function printHelp() {
  console.log(`
Uso:
  node src/scripts/rolloverCompetitiveSeason.js --next-key <season-key> --next-name <season-name> [opciones]

Opciones:
  --league-id <id>                 Liga destino
  --league-key <key>               Key de liga destino
  --current-season-id <id>         Season actual a cerrar
  --current-season-key <key>       Key de la season actual a cerrar
  --next-key <season-key>          Key unica de la nueva season
  --next-name <season-name>        Nombre de la nueva season
  --next-status <pending|active>   Estado de la nueva season. Default: active
  --starts-at <iso-date>           Inicio de la nueva season. Default: ahora
  --ends-at <iso-date>             Fin opcional de la nueva season
  --finalize-ends-at <iso-date>    Fecha de cierre de la season actual
  --seed-mode <carry-over|reset>   Como sembrar standings/snapshot. Default: carry-over
  --dry-run                        Ejecuta todo y revierte al final
  --help                           Muestra esta ayuda
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args['next-key'] || !args['next-name']) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const dryRun = parseBoolean(args['dry-run'], false);

  const options = {
    leagueId: parseInteger(args['league-id'], null),
    leagueKey: args['league-key'] || null,
    currentSeasonId: parseInteger(args['current-season-id'], null),
    currentSeasonKey: args['current-season-key'] || null,
    nextSeasonKey: args['next-key'],
    nextSeasonName: args['next-name'],
    nextStatus: args['next-status'] || 'active',
    nextStartsAt: args['starts-at'] || null,
    nextEndsAt: args['ends-at'] || null,
    finalizeEndsAt: args['finalize-ends-at'] || null,
    seedMode: args['seed-mode'] || 'carry-over',
  };

  try {
    await sequelize.authenticate();

    if (dryRun) {
      const transaction = await sequelize.transaction();

      try {
        const result = await rolloverCompetitiveSeason({
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

    const result = await rolloverCompetitiveSeason(options);
    printJson(result);
  } catch (error) {
    console.error('[season:rollover] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

main();
