const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Notification = sequelize.define('Notification', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    body: {
        type: DataTypes.TEXT,
    },
    data: {
        type: DataTypes.TEXT, // Usually JSON string
    },
    read_at: {
        type: DataTypes.DATE,
    },
}, {
    tableName: 'notifications',
});

module.exports = Notification;
