const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Slot = sequelize.define('Slot', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    time: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    duration: {
        type: DataTypes.INTEGER,
        defaultValue: 90,
    },
    price: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    max_players: {
        type: DataTypes.INTEGER,
        defaultValue: 4,
    },
    is_available: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    external_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    is_synced: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    booked_externally: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    occupant_name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    occupant_phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'slots',
});

module.exports = Slot;
