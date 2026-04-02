'use strict';

const { runCanonicalFoundationBackfill } = require('../services/competitive/backfill');

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await runCanonicalFoundationBackfill({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down() {
    // Intentional no-op: canonical backfill is data repair and should not delete historical data.
  }
};
