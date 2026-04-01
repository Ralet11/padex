const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Court = sequelize.define('Court', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.STRING,
        defaultValue: 'Cristal',
    },
    image: {
        type: DataTypes.STRING,
    },
    surface: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    enclosure: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    venue_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    integration_type: {
        type: DataTypes.ENUM('manual', 'scraping', 'api', 'ical'),
        defaultValue: 'manual',
    },
    integration_config: {
        type: DataTypes.JSON, // Stores URLs, selectors, etc.
        allowNull: true,
    },
    last_sync: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'courts',
});

module.exports = Court;
