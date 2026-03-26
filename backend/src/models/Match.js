const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Match = sequelize.define('Match', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING,
    },
    description: {
        type: DataTypes.TEXT,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'open', // 'open', 'full', 'completed', 'cancelled'
    },
    min_players: {
        type: DataTypes.INTEGER,
        defaultValue: 3,
    },
    max_players: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
    },
    open_category: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    min_category_tier: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
    },
    max_category_tier: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 7,
    },
}, {
    tableName: 'matches',
});

module.exports = Match;
