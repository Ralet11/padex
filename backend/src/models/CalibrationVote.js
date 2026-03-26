const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const CalibrationVote = sequelize.define('CalibrationVote', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    voter_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    target_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    match_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    vote_value: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // e.g. -1 (lower category), 0 (accurate category), 1 (higher category)
    },
}, {
    tableName: 'calibration_votes',
    indexes: [
        {
            unique: true,
            fields: ['voter_id', 'target_id', 'match_id']
        }
    ]
});

module.exports = CalibrationVote;
