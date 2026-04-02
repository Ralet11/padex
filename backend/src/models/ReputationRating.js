const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const ReputationRating = sequelize.define('ReputationRating', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  profile_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  rater_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  rated_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  match_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  score: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  submitted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'reputation_ratings',
});

module.exports = ReputationRating;
