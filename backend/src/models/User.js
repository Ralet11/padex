const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const bcrypt = require('bcryptjs');
const { ensureAvatarSeed } = require('../services/avatarSeed');

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    phone_normalized: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    phone_verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    google_sub: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    apple_sub: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    password: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    avatar: {
        type: DataTypes.STRING,
    },
    avatar_seed: {
        type: DataTypes.JSON,
        allowNull: true,
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
    league_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    season_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    competitive_category: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    competitive_tier: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    competitive_rating: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    competitive_ranking: {
        type: DataTypes.INTEGER,
        allowNull: true,
    },
    progression_points: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
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
    reputation_avg_score: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
    },
    reputation_ratings_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    role: {
        type: DataTypes.ENUM('player', 'partner', 'admin'),
        defaultValue: 'player',
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    profile_completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
}, {
    tableName: 'users',
    hooks: {
        beforeValidate: async (user) => {
            ensureAvatarSeed(user);
        },
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (!user.avatar_seed) {
                ensureAvatarSeed(user);
            }
            if (user.changed('password') && user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    }
});

module.exports = User;
