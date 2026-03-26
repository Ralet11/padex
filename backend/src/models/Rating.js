const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Rating = sequelize.define('Rating', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    score: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    comment: {
        type: DataTypes.TEXT,
    },
}, {
    tableName: 'ratings',
    indexes: [
        {
            unique: true,
            fields: ['rater_id', 'rated_id', 'match_id']
        }
    ]
});

module.exports = Rating;
