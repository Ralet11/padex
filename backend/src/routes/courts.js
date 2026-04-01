const express = require('express');
const { Court, Slot, Venue, sequelize } = require('../models');
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const { ensureSlotsForRange, todayDateStr, parseDateOnly, dateToStr } = require('../services/availability');
const {
  normalizeVenueServices,
  normalizeCourtSurface,
  normalizeCourtEnclosure,
  courtMatchesFilters,
  summarizeCourtMetadata,
} = require('../constants/venueFilters');

const router = express.Router();

function parseVenueFilters(query = {}) {
  return {
    q: String(query.q || '').trim(),
    services: normalizeVenueServices(query.services),
    surface: normalizeCourtSurface(query.surface),
    enclosure: normalizeCourtEnclosure(query.enclosure),
  };
}

async function getFilteredCourtIds(venueId, { surface = null, enclosure = null } = {}) {
  if (!surface && !enclosure) return null;

  const courts = await Court.findAll({
    where: {
      venue_id: venueId,
      ...(surface ? { surface } : {}),
      ...(enclosure ? { enclosure } : {}),
    },
    attributes: ['id'],
  });

  return courts.map((court) => court.id);
}

async function getVenueDateSummaries(venueId, from, to, courtIds = null) {
  if (Array.isArray(courtIds) && courtIds.length === 0) return [];

  const [rows] = await sequelize.query(`
    SELECT
      s.date,
      COUNT(*) as total_slots,
      SUM(CASE WHEN s.is_available = true THEN 1 ELSE 0 END) as available_slots,
      SUM(CASE WHEN s.is_available = false THEN 1 ELSE 0 END) as occupied_slots,
      COUNT(DISTINCT CASE WHEN m.status IN ('open','reserved') THEN m.id END) as has_match
    FROM slots s
    JOIN courts c ON c.id = s.court_id
    LEFT JOIN matches m ON m.slot_id = s.id
    WHERE c.venue_id = :venueId
      ${courtIds ? 'AND c.id IN (:courtIds)' : ''}
      AND s.date BETWEEN :from AND :to
    GROUP BY s.date
    ORDER BY s.date ASC
  `, {
    replacements: courtIds ? { venueId, from, to, courtIds } : { venueId, from, to }
  });

  return rows.map((row) => ({
    date: row.date,
    total_slots: Number(row.total_slots || 0),
    available_slots: Number(row.available_slots || 0),
    occupied_slots: Number(row.occupied_slots || 0),
    has_match: Number(row.has_match || 0),
    has_public_availability: Number(row.available_slots || 0) > 0,
  }));
}

// GET /api/courts
router.get('/', auth, async (req, res) => {
  try {
    const courts = await Court.findAll({
      include: [{ model: Venue, attributes: ['id', 'name', 'address'] }],
      order: [['name', 'ASC']]
    });

    res.json({
      courts: courts.map((court) => ({
        id: court.id,
        name: court.name,
        type: court.type,
        image: court.image,
        surface: court.surface,
        enclosure: court.enclosure,
        venue_id: court.venue_id,
        venue_name: court.Venue?.name || null,
        address: court.Venue?.address || null,
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/courts/venues
router.get('/venues', auth, async (req, res) => {
  try {
    const filters = parseVenueFilters(req.query);
    const venues = await Venue.findAll({
      where: filters.q ? {
        [Op.or]: [
          { name: { [Op.iLike]: `%${filters.q}%` } },
          { address: { [Op.iLike]: `%${filters.q}%` } },
        ]
      } : undefined,
      include: [{
        model: Court,
        attributes: ['id', 'name', 'type', 'image', 'surface', 'enclosure'],
      }],
      order: [['name', 'ASC']]
    });

    const filteredVenues = venues.filter((venue) => {
      const venueServices = Array.isArray(venue.services) ? venue.services : [];
      const servicesMatch = filters.services.every((service) => venueServices.includes(service));
      const courtsMatch = !filters.surface && !filters.enclosure
        ? true
        : (venue.Courts || []).some((court) => courtMatchesFilters(court, filters));

      return servicesMatch && courtsMatch;
    });

    res.json({
      venues: filteredVenues.map((venue) => {
        const allCourts = venue.Courts || [];
        const matchingCourts = filters.surface || filters.enclosure
          ? allCourts.filter((court) => courtMatchesFilters(court, filters))
          : allCourts;

        return {
          ...summarizeCourtMetadata(matchingCourts),
          id: venue.id,
          name: venue.name,
          address: venue.address,
          phone: venue.phone,
          image: venue.image,
          price_per_slot: venue.price_per_slot,
          services: Array.isArray(venue.services) ? venue.services : [],
          courts: matchingCourts.map((court) => ({
            id: court.id,
            name: court.name,
            type: court.type,
            image: court.image,
            surface: court.surface,
            enclosure: court.enclosure,
          })),
          court_count: matchingCourts.length,
          matching_court_count: matchingCourts.length,
          total_court_count: allCourts.length,
        };
      })
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving venues' });
  }
});

// GET /api/courts/venues/:id/slots
router.get('/venues/:id/slots', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const filters = parseVenueFilters(req.query);
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Sede no encontrada' });

    const from = date || todayDateStr();
    const toDate = parseDateOnly(from);
    toDate.setDate(toDate.getDate() + (date ? 0 : 6));
    const to = date || dateToStr(toDate);

    const filteredCourtIds = await getFilteredCourtIds(venue.id, filters);
    if (Array.isArray(filteredCourtIds) && filteredCourtIds.length === 0) {
      return res.json({
        slots: [],
        summary: {
          date: from,
          total_slots: 0,
          available_slots: 0,
          occupied_slots: 0,
          has_match: 0,
          has_public_availability: false,
        },
        date_summaries: []
      });
    }

    await ensureSlotsForRange(venue.id, from, to);
    const dateSummaries = await getVenueDateSummaries(venue.id, from, to, filteredCourtIds);

    const query = `
      SELECT
        s.date,
        s.time,
        MIN(s.duration) as duration,
        MIN(s.price) as price,
        COUNT(*) as available_slots,
        COUNT(DISTINCT CASE WHEN m.status IN ('open','reserved') THEN m.id END) as has_match
      FROM slots s
      JOIN courts c ON c.id = s.court_id
      LEFT JOIN matches m ON m.slot_id = s.id
      WHERE c.venue_id = :venueId
        ${filteredCourtIds ? 'AND c.id IN (:courtIds)' : ''}
        AND s.is_available = true
        ${date ? 'AND s.date = :date' : 'AND s.date >= :from'}
      GROUP BY s.date, s.time
      ORDER BY s.date ASC, s.time ASC
    `;

    const replacements = filteredCourtIds
      ? { venueId: venue.id, from, courtIds: filteredCourtIds }
      : { venueId: venue.id, from };
    if (date) replacements.date = date;

    const [slots] = await sequelize.query(query, { replacements });
    const summary = dateSummaries.find((item) => item.date === from) || {
      date: from,
      total_slots: 0,
      available_slots: 0,
      occupied_slots: 0,
      has_match: 0,
      has_public_availability: false,
    };

    res.json({
      slots: slots.map((slot) => ({
        ...slot,
        available_slots: Number(slot.available_slots || 0),
        has_match: Number(slot.has_match || 0),
        total_slots: summary.total_slots,
        occupied_slots: summary.occupied_slots,
      })),
      summary,
      date_summaries: dateSummaries
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving venue slots' });
  }
});

router.get('/venues/:id/availability-summary', auth, async (req, res) => {
  try {
    const filters = parseVenueFilters(req.query);
    const venue = await Venue.findByPk(req.params.id);
    if (!venue) return res.status(404).json({ error: 'Sede no encontrada' });

    const from = req.query.from || todayDateStr();
    const to = req.query.to || (() => {
      const endDate = parseDateOnly(from);
      endDate.setDate(endDate.getDate() + 6);
      return dateToStr(endDate);
    })();

    const filteredCourtIds = await getFilteredCourtIds(venue.id, filters);
    if (Array.isArray(filteredCourtIds) && filteredCourtIds.length === 0) {
      return res.json({ date_summaries: [] });
    }

    await ensureSlotsForRange(venue.id, from, to);

    res.json({
      date_summaries: await getVenueDateSummaries(venue.id, from, to, filteredCourtIds)
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving venue availability summary' });
  }
});

// GET /api/courts/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const court = await Court.findByPk(req.params.id, {
      include: [{ model: Venue, attributes: ['id', 'name', 'address'] }]
    });
    if (!court) return res.status(404).json({ error: 'Cancha no encontrada' });
    res.json({
      court: {
        id: court.id,
        name: court.name,
        type: court.type,
        image: court.image,
        surface: court.surface,
        enclosure: court.enclosure,
        venue_id: court.venue_id,
        venue_name: court.Venue?.name || null,
        address: court.Venue?.address || null,
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/courts/:id/slots  - turnos disponibles
router.get('/:id/slots', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const court = await Court.findByPk(req.params.id);
    if (!court) return res.status(404).json({ error: 'Cancha no encontrada' });
    const from = date || todayDateStr();
    const toDate = parseDateOnly(from);
    toDate.setDate(toDate.getDate() + (date ? 0 : 6));
    const to = date || dateToStr(toDate);

    await ensureSlotsForRange(court.venue_id, from, to);

    // Using raw SQL on sequelize to mirror the exact SQLite shape 
    // replacing the nested COUNT logic perfectly for postgres.
    const query = `
      SELECT s.*,
        (SELECT COUNT(*) FROM matches m
         JOIN match_players mp ON m.id = mp.match_id
         WHERE m.slot_id = s.id AND m.status IN ('open','reserved')) as players_count,
        (SELECT COUNT(*) FROM matches m WHERE m.slot_id = s.id AND m.status IN ('open','reserved')) as has_match
      FROM slots s
      WHERE s.court_id = :courtId AND s.is_available = true
      ${date ? 'AND s.date = :date' : 'AND s.date >= :from'}
      ORDER BY s.date ASC, s.time ASC
    `;

    const replacements = { courtId: req.params.id, from };
    if (date) replacements.date = date;

    const [slots] = await sequelize.query(query, {
      replacements
    });

    res.json({ slots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error retrieving slots' });
  }
});

module.exports = router;
