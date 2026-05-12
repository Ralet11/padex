require('dotenv').config();

const { Op } = require('sequelize');
const {
  sequelize,
  Match,
  MatchPlayer,
  MatchPayment,
  CompetitiveResult,
  Rating,
  ReputationRating,
  CalibrationVote,
  Slot,
} = require('../models');
const { MATCH_STATES } = require('../constants/matchStates');
const { SLOT_STATES } = require('../constants/slotStates');
const { updateSlotLifecycle } = require('../services/competitive/matchLifecycle');
const { DEMO_MATCH_PREFIX } = require('./seedDemoData');
const {
  parseArgs,
  parseBoolean,
  printJson,
} = require('./utils/cliArgs');

const CLEAR_SCOPE_VALUES = Object.freeze({
  DEMO: 'demo',
  NON_COMPLETED: 'non-completed',
});

function printHelp() {
  console.log(`
Uso:
  node src/scripts/clearDevMatches.js [opciones]

Opciones:
  --scope <demo|non-completed>    Alcance del borrado. Default: non-completed
  --title-prefix <texto>          Prefijo para scope=demo. Default: "${DEMO_MATCH_PREFIX}"
  --dry-run                       Ejecuta el borrado y revierte al final
  --yes                           Confirma el borrado real
  --help                          Muestra esta ayuda

Notas:
  - Este script esta pensado para desarrollo.
  - Solo borra partidos demo o no completados para no desalinear ranking e historial competitivo.
`);
}

function resolveScope(value) {
  const normalized = String(value || CLEAR_SCOPE_VALUES.NON_COMPLETED).trim().toLowerCase();
  if (Object.values(CLEAR_SCOPE_VALUES).includes(normalized)) {
    return normalized;
  }

  throw new Error(`Scope invalido: ${value}`);
}

function assertSafeExecution({ dryRun, yes }) {
  const normalizedNodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase();
  if (normalizedNodeEnv === 'production') {
    throw new Error('clearDevMatches no se ejecuta con NODE_ENV=production');
  }

  if (!dryRun && !yes) {
    throw new Error('Para borrar de verdad agrega --yes. Usa --dry-run para simular.');
  }
}

function buildMatchWhere({ scope, titlePrefix }) {
  const nonCompletedWhere = {
    [Op.or]: [
      {
        state: {
          [Op.in]: [
            MATCH_STATES.DRAFT,
            MATCH_STATES.OPEN,
            MATCH_STATES.RESERVED,
            MATCH_STATES.IN_PROGRESS,
            MATCH_STATES.CANCELLED,
          ],
        },
      },
      {
        status: {
          [Op.in]: ['open', 'reserved', 'cancelled'],
        },
      },
    ],
  };

  if (scope === CLEAR_SCOPE_VALUES.DEMO) {
    return {
      [Op.and]: [
        {
          title: {
            [Op.iLike]: `${titlePrefix}%`,
          },
        },
        nonCompletedWhere,
      ],
    };
  }

  return nonCompletedWhere;
}

async function releaseOrReopenSlots(slotIds, deletedMatchIds, transaction) {
  const uniqueSlotIds = [...new Set((slotIds || []).filter(Boolean))];
  if (uniqueSlotIds.length === 0) {
    return {
      touched: 0,
      moved_to_available: 0,
      moved_to_released: 0,
      skipped: 0,
    };
  }

  const slots = await Slot.findAll({
    where: { id: { [Op.in]: uniqueSlotIds } },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  const remainingMatches = await Match.findAll({
    where: {
      id: deletedMatchIds.length > 0 ? { [Op.notIn]: deletedMatchIds } : undefined,
      slot_id: {
        [Op.in]: uniqueSlotIds,
      },
      [Op.or]: [
        {
          state: {
            [Op.in]: [
              MATCH_STATES.DRAFT,
              MATCH_STATES.OPEN,
              MATCH_STATES.RESERVED,
              MATCH_STATES.IN_PROGRESS,
            ],
          },
        },
        {
          status: {
            [Op.in]: ['open', 'reserved'],
          },
        },
      ],
    },
    attributes: ['slot_id'],
    transaction,
  });

  const blockedSlotIds = new Set(remainingMatches.map((match) => Number(match.slot_id)));
  const summary = {
    touched: 0,
    moved_to_available: 0,
    moved_to_released: 0,
    skipped: 0,
  };

  for (const slot of slots) {
    if (blockedSlotIds.has(Number(slot.id)) || slot.booked_externally) {
      summary.skipped += 1;
      continue;
    }

    if (slot.state === SLOT_STATES.HELD) {
      await updateSlotLifecycle(slot, SLOT_STATES.AVAILABLE, { transaction });
      summary.touched += 1;
      summary.moved_to_available += 1;
      continue;
    }

    if ([SLOT_STATES.RESERVED, SLOT_STATES.OCCUPIED].includes(slot.state)) {
      await updateSlotLifecycle(slot, SLOT_STATES.RELEASED, { transaction });
      summary.touched += 1;
      summary.moved_to_released += 1;
      continue;
    }

    summary.skipped += 1;
  }

  return summary;
}

async function destroyForMatchIds(matchIds, transaction) {
  if (matchIds.length === 0) {
    return {
      payments_deleted: 0,
      calibration_votes_deleted: 0,
      reputation_ratings_deleted: 0,
      ratings_deleted: 0,
      competitive_results_deleted: 0,
      match_players_deleted: 0,
      matches_deleted: 0,
    };
  }

  const matchIdWhere = { match_id: { [Op.in]: matchIds } };

  const payments_deleted = await MatchPayment.destroy({ where: matchIdWhere, transaction });
  const calibration_votes_deleted = await CalibrationVote.destroy({ where: matchIdWhere, transaction });
  const reputation_ratings_deleted = await ReputationRating.destroy({ where: matchIdWhere, transaction });
  const ratings_deleted = await Rating.destroy({ where: matchIdWhere, transaction });
  const competitive_results_deleted = await CompetitiveResult.destroy({ where: matchIdWhere, transaction });
  const match_players_deleted = await MatchPlayer.destroy({ where: matchIdWhere, transaction });
  const matches_deleted = await Match.destroy({
    where: { id: { [Op.in]: matchIds } },
    transaction,
  });

  return {
    payments_deleted,
    calibration_votes_deleted,
    reputation_ratings_deleted,
    ratings_deleted,
    competitive_results_deleted,
    match_players_deleted,
    matches_deleted,
  };
}

async function clearDevMatches(options = {}) {
  const scope = resolveScope(options.scope);
  const titlePrefix = String(options.titlePrefix || DEMO_MATCH_PREFIX).trim() || DEMO_MATCH_PREFIX;
  const executor = options.transaction
    ? async (callback) => callback(options.transaction)
    : async (callback) => sequelize.transaction(callback);

  return executor(async (transaction) => {
    const where = buildMatchWhere({ scope, titlePrefix });
    const matches = await Match.findAll({
      where,
      attributes: ['id', 'slot_id', 'title', 'state', 'status'],
      order: [['id', 'ASC']],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const matchIds = matches.map((match) => match.id);
    const slotIds = matches.map((match) => match.slot_id).filter(Boolean);
    const deleted = await destroyForMatchIds(matchIds, transaction);
    const slots = await releaseOrReopenSlots(slotIds, matchIds, transaction);

    return {
      scope,
      title_prefix: scope === CLEAR_SCOPE_VALUES.DEMO ? titlePrefix : null,
      matches_matched: matches.length,
      match_ids: matchIds,
      deleted,
      slots,
    };
  });
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
        const result = await clearDevMatches({
          scope: args.scope,
          titlePrefix: args['title-prefix'],
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

    const result = await clearDevMatches({
      scope: args.scope,
      titlePrefix: args['title-prefix'],
    });
    printJson(result);
  } catch (error) {
    console.error('[dev:matches:clear] Failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  CLEAR_SCOPE_VALUES,
  clearDevMatches,
};
