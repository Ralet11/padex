const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const ReputationProfile = sequelize.define('ReputationProfile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  avg_score: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  ratings_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  last_rated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'reputation_profiles',
});

module.exports = ReputationProfile;
