const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const CompetitiveResult = sequelize.define('CompetitiveResult', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  match_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  season_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  winning_side: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  score: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  recorded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  recorded_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  source_surface: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'backend',
  },
}, {
  tableName: 'competitive_results',
});

module.exports = CompetitiveResult;
