const { Op } = require('sequelize');
const { Court, Slot, Venue, AvailabilityRule, AvailabilityException, CourtClosure, Match } = require('../models');

function parseTimeToMinutes(time) {
    if (!/^\d{2}:\d{2}$/.test(time || '')) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

function formatMinutes(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeWindows({ windows, start_time, end_time }) {
    if (Array.isArray(windows) && windows.length > 0) {
        return windows
            .map((window) => ({
                start_time: window?.start_time,
                end_time: window?.end_time
            }))
            .filter((window) => window.start_time && window.end_time);
    }

    if (start_time && end_time) {
        return [{ start_time, end_time }];
    }

    return [];
}

function normalizeRules({ rules, weekdays, windows, start_time, end_time }) {
    if (Array.isArray(rules) && rules.length > 0) {
        return rules
            .map((rule) => ({
                weekdays: Array.isArray(rule?.weekdays) ? rule.weekdays : [],
                windows: normalizeWindows({
                    windows: rule?.windows,
                    start_time: rule?.start_time,
                    end_time: rule?.end_time
                })
            }))
            .filter((rule) => rule.weekdays.length > 0 && rule.windows.length > 0);
    }

    return [{
        weekdays: Array.isArray(weekdays) ? weekdays : [],
        windows: normalizeWindows({ windows, start_time, end_time })
    }].filter((rule) => rule.weekdays.length > 0 && rule.windows.length > 0);
}

function parseDateOnly(dateStr) {
    if (!dateStr) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function dateToStr(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function todayDateStr() {
    return dateToStr(new Date());
}

function rangesOverlap(startA, endA, startB, endB) {
    return startA <= endB && startB <= endA;
}

async function ensureSlotsForRange(venueId, from, to) {
    const venue = await Venue.findByPk(venueId, { attributes: ['id', 'price_per_slot'] });
    const courts = await Court.findAll({
        where: { venue_id: venueId },
        attributes: ['id']
    });
    const rules = await AvailabilityRule.findAll({
        where: {
            venue_id: venueId,
            is_active: true
        }
    });
    const dayOverrides = await AvailabilityException.findAll({
        where: {
            venue_id: venueId,
            court_id: null,
            date: {
                [Op.between]: [from, to]
            }
        }
    });
    const closures = await CourtClosure.findAll({
        where: {
            venue_id: venueId,
            start_date: { [Op.lte]: to },
            end_date: { [Op.gte]: from }
        }
    });

    if (!venue || courts.length === 0 || (rules.length === 0 && dayOverrides.length === 0 && closures.length === 0)) {
        return { created: 0, skipped: 0 };
    }

    const duration = 90;
    const pricePerSlot = Number(venue.price_per_slot || 0);
    const startDate = parseDateOnly(from);
    const endDate = parseDateOnly(to);
    const created = [];
    let skipped = 0;
    const allCourtIds = courts.map((court) => court.id);
    const dayOverrideMap = new Map(dayOverrides.map((item) => [item.date, item]));
    const activeMatches = await Match.findAll({
        where: {
            status: { [Op.in]: ['open', 'reserved'] }
        },
        include: [{
            model: Slot,
            attributes: ['id', 'court_id', 'date', 'time']
        }]
    });
    const protectedSlotKeys = new Set(
        activeMatches
            .map((match) => match.Slot)
            .filter(Boolean)
            .map((slot) => `${slot.court_id}:${slot.date}:${slot.time}`)
    );

    for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dateStr = dateToStr(currentDate);
        const weekday = currentDate.getDay();
        const dayOverride = dayOverrideMap.get(dateStr);

        const ruleWindowsByCourt = new Map();
        for (const rule of rules) {
            if (!rangesOverlap(rule.start_date, rule.end_date, dateStr, dateStr)) continue;

            const weekdays = Array.isArray(rule.weekdays) ? rule.weekdays.map((day) => parseInt(day, 10)) : [];
            if (!weekdays.includes(weekday)) continue;

            const courtIds = Array.isArray(rule.court_ids) ? rule.court_ids : [];
            const windows = Array.isArray(rule.windows) ? rule.windows : [];

            for (const courtId of courtIds) {
                if (!ruleWindowsByCourt.has(courtId)) ruleWindowsByCourt.set(courtId, []);
                ruleWindowsByCourt.get(courtId).push(...windows);
            }
        }

        const closedCourtIds = new Set(
            closures
                .filter((closure) => rangesOverlap(closure.start_date, closure.end_date, dateStr, dateStr))
                .map((closure) => closure.court_id)
        );
        const courtIdsForDate = new Set([
            ...(dayOverride ? allCourtIds : ruleWindowsByCourt.keys()),
            ...closedCourtIds
        ]);

        for (const courtId of courtIdsForDate) {
            const isClosed = closedCourtIds.has(courtId);
            const windows = dayOverride
                ? (Array.isArray(dayOverride.windows) ? dayOverride.windows : [])
                : (ruleWindowsByCourt.get(courtId) || []);

            if (dayOverride || isClosed) {
                const removableSlots = await Slot.findAll({
                    where: {
                        court_id: courtId,
                        date: dateStr,
                        is_available: true,
                        booked_externally: false
                    },
                    attributes: ['id', 'court_id', 'date', 'time']
                });

                const removableIds = removableSlots
                    .filter((slot) => !protectedSlotKeys.has(`${slot.court_id}:${slot.date}:${slot.time}`))
                    .map((slot) => slot.id);

                if (removableIds.length > 0) {
                    await Slot.destroy({
                        where: {
                            id: { [Op.in]: removableIds }
                        }
                    });
                }
            }
            if (isClosed) continue;

            for (const window of windows) {
                const startMinutes = parseTimeToMinutes(window.start_time);
                const endMinutes = parseTimeToMinutes(window.end_time);
                if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) continue;

                for (let minutes = startMinutes; minutes + duration <= endMinutes; minutes += duration) {
                    const time = formatMinutes(minutes);
                    const [slot, wasCreated] = await Slot.findOrCreate({
                        where: {
                            court_id: courtId,
                            date: dateStr,
                            time
                        },
                        defaults: {
                            court_id: courtId,
                            date: dateStr,
                            time,
                            duration,
                            price: pricePerSlot,
                            is_available: true
                        }
                    });

                    if (wasCreated) created.push(slot);
                    else {
                        const slotKey = `${slot.court_id}:${slot.date}:${slot.time}`;
                        if (
                            slot.is_available
                            && !slot.booked_externally
                            && !protectedSlotKeys.has(slotKey)
                            && Number(slot.price || 0) !== pricePerSlot
                        ) {
                            await slot.update({ price: pricePerSlot });
                        }
                        skipped += 1;
                    }
                }
            }
        }
    }

    return { created: created.length, skipped };
}

module.exports = {
    parseTimeToMinutes,
    formatMinutes,
    normalizeWindows,
    normalizeRules,
    parseDateOnly,
    dateToStr,
    todayDateStr,
    rangesOverlap,
    ensureSlotsForRange,
};
