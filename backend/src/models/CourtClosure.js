const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');

const CourtClosure = sequelize.define('CourtClosure', {
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
        allowNull: false,
    },
    start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
    reason: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'court_closures',
});

module.exports = CourtClosure;
