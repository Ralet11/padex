const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    avatar: {
        type: DataTypes.STRING,
    },
    position: {
        type: DataTypes.STRING,
        defaultValue: 'drive', // 'drive' or 'reves'
    },
    paddle_brand: {
        type: DataTypes.STRING,
    },
    favorite_court_id: {
        type: DataTypes.INTEGER,
    },
    preferred_partner: {
        type: DataTypes.STRING,
    },
    bio: {
        type: DataTypes.STRING,
    },
    stars: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    category_tier: {
        type: DataTypes.INTEGER,
        defaultValue: 7, // 7ma to 1ra
    },
    matches_played: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    category: {
        type: DataTypes.STRING,
        defaultValue: 'principiante',
    },
    self_category: {
        type: DataTypes.STRING,
    },
    wins: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    losses: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    role: {
        type: DataTypes.ENUM('player', 'partner', 'admin'),
        defaultValue: 'player',
    },
}, {
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

module.exports = User;
