const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Season = sequelize.define('Season', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  league_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pending',
  },
  starts_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  ends_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'seasons',
});

module.exports = Season;
