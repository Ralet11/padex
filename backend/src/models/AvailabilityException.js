const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const AvailabilityException = sequelize.define('AvailabilityException', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    venue_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    court_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    windows: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
    },
    is_closed: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
}, {
    tableName: 'availability_exceptions',
});

module.exports = AvailabilityException;
