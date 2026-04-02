const { DataTypes } = require('sequelize');
const { sequelize } = require('../database');
const { SLOT_STATE_VALUES, deriveSlotState, isSlotAvailableState } = require('../constants/slotStates');

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
    state: {
        type: DataTypes.ENUM(...SLOT_STATE_VALUES),
        allowNull: false,
        defaultValue: 'available',
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
    hooks: {
        beforeValidate: (slot) => {
            if (slot.changed('state') && slot.state) {
                slot.is_available = isSlotAvailableState(slot.state);
                return;
            }

            slot.state = deriveSlotState({
                is_available: slot.is_available,
                booked_externally: slot.booked_externally,
                occupant_name: slot.occupant_name,
                occupant_phone: slot.occupant_phone,
            });

            if (slot.state) {
                slot.is_available = isSlotAvailableState(slot.state);
            }
        }
    }
});

module.exports = Slot;
