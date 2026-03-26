const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const Connection = sequelize.define('Connection', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'pending', // 'pending', 'accepted', 'rejected'
    },
}, {
    tableName: 'connections',
    indexes: [
        {
            unique: true,
            fields: ['requester_id', 'addressee_id']
        }
    ]
});

module.exports = Connection;
