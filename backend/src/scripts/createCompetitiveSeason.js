require('dotenv').config();

const { sequelize } = require('../models');
const { createCompetitiveSeason } = require('../services/competitive/seasonLifecycle');
const {
  parseArgs,
  parseBoolean,
  parseInteger,
  printJson,
} = require('./utils/cliArgs');

function printHelp() {
  console.log(`
Uso:
  node src/scripts/createCompetitiveSeason.js --key <season-key> --name <season-name> [opciones]

Opciones:
  --league-id <id>                 Liga destino
  --league-key <key>               Key de liga destino
  --key <season-key>               Key unica de la season
  --name <season-name>             Nombre de la season
  --status <pending|active>        Estado inicial. Default: pending
  --starts-at <iso-date>           Inicio. Default: ahora
  --ends-at <iso-date>             Fin opcional
  --seed-players <true|false>      Pueblar standings desde players. Default: true si status=active
  --seed-mode <carry-over|reset>   Como sembrar snapshot competitivo. Default: carry-over
  --finalize-current-active        Cierra la active actual antes de crear una nueva active
  --finalize-ends-at <iso-date>    Fecha de cierre para la season anterior
  --dry-run                        Ejecuta todo y revierte al final
  --help                           Muestra esta ayuda
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help || !args.key || !args.name) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const status = String(args.status || 'pending').trim().toLowerCase();
  const dryRun = parseBoolean(args['dry-run'], false);
  const seedPlayers = typeof args['seed-players'] === 'undefined'
    ? status === 'active'
    : parseBoolean(args['seed-players'], false);

  const options = {
    leagueId: parseInteger(args['league-id'], null),
    leagueKey: args['league-key'] || null,
    seasonKey: args.key,
    name: args.name,
    status,
    startsAt: args['starts-at'] || null,
    endsAt: args['ends-at'] || null,
    seedPlayers,
    seedMode: args['seed-mode'] || 'carry-over',
    finalizeCurrentActive: parseBoolean(args['finalize-current-active'], false),
    finalizeEndsAt: args['finalize-ends-at'] || null,
  };

  try {
    await sequelize.authenticate();

    if (dryRun) {
      const transaction = await sequelize.transaction();

      try {
        const result = await createCompetitiveSeason({
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

    const result = await createCompetitiveSeason(options);
    printJson(result);
  } catch (error) {
    console.error('[season:create] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

main();
