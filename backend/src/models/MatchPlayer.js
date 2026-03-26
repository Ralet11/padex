const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const MatchPlayer = sequelize.define('MatchPlayer', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    team: {
        type: DataTypes.STRING,
    },
    result: {
        type: DataTypes.STRING, // 'win', 'loss', 'draw'
    },
    stars_earned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
}, {
    tableName: 'match_players',
    indexes: [
        {
            unique: true,
            fields: ['match_id', 'user_id']
        }
    ]
});

module.exports = MatchPlayer;
