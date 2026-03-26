const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Venue = sequelize.define('Venue', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    address: {
        type: DataTypes.STRING,
    },
    phone: {
        type: DataTypes.STRING,
    },
    price_per_slot: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
    },
    image: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    manager_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'venues',
});

module.exports = Venue;
