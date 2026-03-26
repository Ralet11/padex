const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    read_at: {
        type: DataTypes.DATE, // Nullable Date
    },
}, {
    tableName: 'messages',
});

module.exports = Message;
