const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const League = sequelize.define('League', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
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
    defaultValue: 'active',
  },
}, {
  tableName: 'leagues',
});

module.exports = League;
