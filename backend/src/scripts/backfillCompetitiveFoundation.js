process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/padex';

const { sequelize } = require('../models');
const { runCanonicalFoundationBackfill } = require('../services/competitive/backfill');

async function main() {
  try {
    await sequelize.authenticate();
    const result = await runCanonicalFoundationBackfill();
    console.log('[backfill] Canonical foundation synced');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('[backfill] Failed to sync canonical foundation', error);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
  }
}

main();
