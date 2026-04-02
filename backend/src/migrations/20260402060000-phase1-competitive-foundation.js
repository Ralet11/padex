'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leagues', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      key: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'active' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('seasons', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      league_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'leagues', key: 'id' }, onDelete: 'CASCADE' },
      key: { type: Sequelize.STRING, allowNull: false, unique: true },
      name: { type: Sequelize.STRING, allowNull: false },
      status: { type: Sequelize.STRING, allowNull: false, defaultValue: 'pending' },
      starts_at: { type: Sequelize.DATE, allowNull: true },
      ends_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('competitive_standings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      league_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'leagues', key: 'id' }, onDelete: 'SET NULL' },
      season_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'seasons', key: 'id' }, onDelete: 'SET NULL' },
      category: { type: Sequelize.STRING, allowNull: true },
      tier: { type: Sequelize.INTEGER, allowNull: true },
      rating: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      ranking: { type: Sequelize.INTEGER, allowNull: true },
      progression_points: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      wins: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      losses: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      legacy_stars: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      legacy_category_tier: { type: Sequelize.INTEGER, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
    await queryInterface.addIndex('competitive_standings', ['user_id', 'season_id'], { unique: true, name: 'competitive_standings_user_season_unique' });

    await queryInterface.createTable('competitive_results', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      match_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'matches', key: 'id' }, onDelete: 'CASCADE' },
      season_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'seasons', key: 'id' }, onDelete: 'SET NULL' },
      winning_side: { type: Sequelize.STRING, allowNull: false },
      score: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
      recorded_by: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'users', key: 'id' }, onDelete: 'SET NULL' },
      recorded_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      source_surface: { type: Sequelize.STRING, allowNull: false, defaultValue: 'backend' },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('reputation_profiles', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      user_id: { type: Sequelize.INTEGER, allowNull: false, unique: true, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      avg_score: { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 },
      ratings_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      last_rated_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.createTable('reputation_ratings', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      profile_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'reputation_profiles', key: 'id' }, onDelete: 'SET NULL' },
      rater_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      rated_id: { type: Sequelize.INTEGER, allowNull: false, references: { model: 'users', key: 'id' }, onDelete: 'CASCADE' },
      match_id: { type: Sequelize.INTEGER, allowNull: true, references: { model: 'matches', key: 'id' }, onDelete: 'SET NULL' },
      score: { type: Sequelize.INTEGER, allowNull: false },
      comment: { type: Sequelize.TEXT, allowNull: true },
      submitted_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });

    await queryInterface.addColumn('slots', 'state', { type: Sequelize.STRING, allowNull: false, defaultValue: 'available' });
    await queryInterface.addColumn('matches', 'state', { type: Sequelize.STRING, allowNull: false, defaultValue: 'open' });
    await queryInterface.addColumn('matches', 'result_recorded_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('matches', 'settled_at', { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn('matches', 'competitive_season_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'seasons', key: 'id' }, onDelete: 'SET NULL' });

    await queryInterface.addColumn('match_players', 'competitive_result', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('match_players', 'rating_delta', { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('match_players', 'progression_points_delta', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });

    await queryInterface.addColumn('users', 'league_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'leagues', key: 'id' }, onDelete: 'SET NULL' });
    await queryInterface.addColumn('users', 'season_id', { type: Sequelize.INTEGER, allowNull: true, references: { model: 'seasons', key: 'id' }, onDelete: 'SET NULL' });
    await queryInterface.addColumn('users', 'competitive_category', { type: Sequelize.STRING, allowNull: true });
    await queryInterface.addColumn('users', 'competitive_tier', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('users', 'competitive_rating', { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('users', 'competitive_ranking', { type: Sequelize.INTEGER, allowNull: true });
    await queryInterface.addColumn('users', 'progression_points', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('users', 'reputation_avg_score', { type: Sequelize.FLOAT, allowNull: false, defaultValue: 0 });
    await queryInterface.addColumn('users', 'reputation_ratings_count', { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('users', 'reputation_ratings_count');
    await queryInterface.removeColumn('users', 'reputation_avg_score');
    await queryInterface.removeColumn('users', 'progression_points');
    await queryInterface.removeColumn('users', 'competitive_ranking');
    await queryInterface.removeColumn('users', 'competitive_rating');
    await queryInterface.removeColumn('users', 'competitive_tier');
    await queryInterface.removeColumn('users', 'competitive_category');
    await queryInterface.removeColumn('users', 'season_id');
    await queryInterface.removeColumn('users', 'league_id');

    await queryInterface.removeColumn('match_players', 'progression_points_delta');
    await queryInterface.removeColumn('match_players', 'rating_delta');
    await queryInterface.removeColumn('match_players', 'competitive_result');

    await queryInterface.removeColumn('matches', 'competitive_season_id');
    await queryInterface.removeColumn('matches', 'settled_at');
    await queryInterface.removeColumn('matches', 'result_recorded_at');
    await queryInterface.removeColumn('matches', 'state');
    await queryInterface.removeColumn('slots', 'state');

    await queryInterface.dropTable('reputation_ratings');
    await queryInterface.dropTable('reputation_profiles');
    await queryInterface.dropTable('competitive_results');
    await queryInterface.dropTable('competitive_standings');
    await queryInterface.dropTable('seasons');
    await queryInterface.dropTable('leagues');
  }
};
