const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { MATCH_STATE_VALUES, deriveLegacyStatus, deriveMatchState } = require('../constants/matchStates');

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
    state: {
        type: DataTypes.ENUM(...MATCH_STATE_VALUES),
        allowNull: false,
        defaultValue: 'open',
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
    result_recorded_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    settled_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    competitive_season_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
}, {
    tableName: 'matches',
    hooks: {
        beforeValidate: (match) => {
            if (match.changed('state') && match.state) {
                match.status = deriveLegacyStatus({ state: match.state });
            } else {
                match.state = deriveMatchState({ status: match.status });
                match.status = deriveLegacyStatus({ state: match.state });
            }

            if (match.state === 'completed' && !match.result_recorded_at) {
                match.result_recorded_at = new Date();
            }

            if (match.settled_at && match.state !== 'completed') {
                match.state = 'completed';
                match.status = 'completed';
            }
        }
    }
});

module.exports = Match;
