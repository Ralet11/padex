const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const CompetitiveStanding = sequelize.define('CompetitiveStanding', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  league_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  season_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tier: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rating: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  ranking: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  progression_points: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  wins: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  losses: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  legacy_stars: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  legacy_category_tier: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  tableName: 'competitive_standings',
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'season_id']
    }
  ]
});

module.exports = CompetitiveStanding;
