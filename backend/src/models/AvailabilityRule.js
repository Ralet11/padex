const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const AvailabilityRule = sequelize.define('AvailabilityRule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    venue_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    court_ids: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    weekdays: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    windows: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'availability_rules',
});

module.exports = AvailabilityRule;
