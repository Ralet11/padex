const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { RESULT_OUTCOMES } = require('../constants/domainEvents');

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
    competitive_result: {
        type: DataTypes.ENUM(...Object.values(RESULT_OUTCOMES)),
        allowNull: true,
    },
    stars_earned: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    rating_delta: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    progression_points_delta: {
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
