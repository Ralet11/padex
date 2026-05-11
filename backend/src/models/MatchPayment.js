const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const {
  MATCH_PAYMENT_ROLE_VALUES,
  MATCH_PAYMENT_STATUS_VALUES,
  MATCH_PAYMENT_PROVIDER_VALUES,
  MATCH_PAYMENT_PROVIDERS,
} = require('../constants/matchPayments');

const MatchPayment = sequelize.define('MatchPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  provider: {
    type: DataTypes.ENUM(...MATCH_PAYMENT_PROVIDER_VALUES),
    allowNull: false,
    defaultValue: MATCH_PAYMENT_PROVIDERS.MOCK,
  },
  role: {
    type: DataTypes.ENUM(...MATCH_PAYMENT_ROLE_VALUES),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM(...MATCH_PAYMENT_STATUS_VALUES),
    allowNull: false,
    defaultValue: 'pending',
  },
  position_index: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  base_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  extra_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  total_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  currency: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'ARS',
  },
  external_reference: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  provider_preference_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  provider_payment_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  checkout_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  sandbox_checkout_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  provider_payload: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  failure_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  refund_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  refunded_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'match_payments',
  indexes: [
    { fields: ['match_id'] },
    { fields: ['slot_id'] },
    { fields: ['user_id'] },
    { fields: ['status'] },
    { unique: true, fields: ['external_reference'] },
  ],
});

module.exports = MatchPayment;
