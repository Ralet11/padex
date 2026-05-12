require('dotenv').config();

const { sequelize } = require('../models');
const { clearDevMatches } = require('./clearDevMatches');
const { createDevMatches } = require('./createDevMatches');
const { DEMO_MATCH_PREFIX, TARGET_OPEN_MATCHES } = require('./seedDemoData');
const {
  parseArgs,
  parseBoolean,
  printJson,
} = require('./utils/cliArgs');

function printHelp() {
  console.log(`
Uso:
  node src/scripts/resetDevMatches.js [opciones]

Opciones:
  --scope <demo|non-completed>    Alcance del borrado previo. Default: non-completed
  --title-prefix <texto>          Prefijo para scope=demo. Default: "${DEMO_MATCH_PREFIX}"
  --count <numero>                Total objetivo de partidos demo abiertos. Default: ${TARGET_OPEN_MATCHES}
  --payment-required <true|false> Recrea partidos demo con pagos habilitados. Default: false
  --dry-run                       Simula limpieza + recreacion y revierte al final
  --yes                           Confirma la ejecucion real
  --help                          Muestra esta ayuda
`);
}

function assertSafeExecution({ dryRun, yes }) {
  const normalizedNodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  if (normalizedNodeEnv === 'production') {
    throw new Error('resetDevMatches no se ejecuta con NODE_ENV=production');
  }

  if (!dryRun && !yes) {
    throw new Error('Para ejecutar de verdad agrega --yes. Usa --dry-run para simular.');
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const dryRun = parseBoolean(args['dry-run'], false);
  const yes = parseBoolean(args.yes, false);

  try {
    assertSafeExecution({ dryRun, yes });
    await sequelize.authenticate();

    if (dryRun) {
      const transaction = await sequelize.transaction();

      try {
        const cleared = await clearDevMatches({
          scope: args.scope,
          titlePrefix: args['title-prefix'],
          transaction,
        });
        const created = await createDevMatches({
          count: args.count,
          paymentRequired: args['payment-required'],
          transaction,
        });
        await transaction.rollback();
        printJson({
          dry_run: true,
          cleared,
          created,
        });
        return;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    }

    const cleared = await clearDevMatches({
      scope: args.scope,
      titlePrefix: args['title-prefix'],
    });
    const created = await createDevMatches({
      count: args.count,
      paymentRequired: args['payment-required'],
    });

    printJson({
      cleared,
      created,
    });
  } catch (error) {
    console.error('[dev:matches:reset] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}
