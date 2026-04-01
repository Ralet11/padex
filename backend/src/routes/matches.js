const express = require('express');
const { Op } = require('sequelize');
const { Match, Slot, Court, Venue, User, MatchPlayer } = require('../models');
const auth = require('../middleware/auth');
const { notifyCourtByWhatsApp, notifyAdminWhatsApp } = require('../services/notifications');
const { calculateStarsEarned, categoryFromStars, nameFromTier } = require('../services/elo');
const { dateToStr } = require('../services/availability');
const { emitVenueAvailabilityUpdate } = require('../services/realtime');

const router = express.Router();

function normalizeCategoryRule({ open_category, min_category_tier, max_category_tier, creatorTier }) {
  const isOpenCategory = open_category !== undefined
    ? Boolean(open_category)
    : !(min_category_tier || max_category_tier);

  if (isOpenCategory) {
    return {
      open_category: true,
      min_category_tier: 1,
      max_category_tier: 7,
    };
  }

  const normalizedMin = Math.min(7, Math.max(1, Number(min_category_tier) || creatorTier || 7));
  const normalizedMax = Math.min(7, Math.max(1, Number(max_category_tier) || creatorTier || 7));

  return {
    open_category: false,
    min_category_tier: Math.min(normalizedMin, normalizedMax),
    max_category_tier: Math.max(normalizedMin, normalizedMax),
  };
}

function isUserAllowedByCategoryRule(match, userTier) {
  if (match.open_category) return true;
  return userTier >= match.min_category_tier && userTier <= match.max_category_tier;
}

function parseCategoryTierFilter(value) {
  if (value === undefined || value === null) return null;

  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === 'todos') return null;

  const numericTier = Number(normalized.replace(/[^\d]/g, ''));
  if (Number.isInteger(numericTier) && numericTier >= 1 && numericTier <= 7) {
    return numericTier;
  }

  for (let tier = 1; tier <= 7; tier += 1) {
    const tierName = nameFromTier(tier).toLowerCase();
    const shortName = tierName.split(' ')[0];
    if (normalized === tierName || normalized === shortName) {
      return tier;
    }
  }

  return null;
}

async function canReopenSlot(slotId) {
  const slot = await Slot.findByPk(slotId);
  return Boolean(slot) && !slot.booked_externally;
}

async function getMatchWithDetails(matchId) {
  return await Match.findByPk(matchId, {
    include: [
      {
        model: Slot,
        include: [{
          model: Court,
          include: [{ model: Venue, attributes: ['id', 'name', 'address', 'image'] }]
        }]
      },
      {
        model: User,
        as: 'Creator',
        attributes: ['id', 'name', 'stars', 'category_tier', 'avatar']
      },
      {
        model: MatchPlayer,
        as: 'Players',
        include: [{
          model: User,
          as: 'User',
          attributes: ['id', 'name', 'stars', 'category_tier', 'position', 'avatar']
        }]
      }
    ]
  });
}

async function emitSlotAvailabilityUpdate(slotId, reason) {
  const slot = await Slot.findByPk(slotId, {
    include: [{ model: Court, attributes: ['venue_id'] }]
  });
  if (!slot?.Court?.venue_id) return;

  emitVenueAvailabilityUpdate({
    venueId: slot.Court.venue_id,
    date: slot.date,
    reason,
  });
}

// GET /api/matches - listar partidos abiertos
router.get('/', auth, async (req, res) => {
  try {
    const { date, court_id } = req.query;
    const categoryTier = parseCategoryTierFilter(req.query.category_tier || req.query.category);

    const whereRules = { status: 'open' };
    const slotWhereRules = {};

    // Get today at 00:00 for the minimum date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = dateToStr(today);

    if (date) {
      slotWhereRules.date = date;
    } else {
      slotWhereRules.date = { [Op.gte]: todayIso };
    }

    if (court_id) {
      slotWhereRules.court_id = court_id;
    }

    if (categoryTier) {
      whereRules[Op.or] = [
        { open_category: true },
        {
          open_category: false,
          min_category_tier: { [Op.lte]: categoryTier },
          max_category_tier: { [Op.gte]: categoryTier },
        },
      ];
    }

    const matches = await Match.findAll({
      where: whereRules,
      include: [
        {
          model: Slot,
          where: slotWhereRules,
          include: [{ model: Court }]
        },
        {
          model: User,
          as: 'Creator',
          attributes: ['name', 'stars', 'category_tier', 'avatar']
        },
        {
          model: MatchPlayer,
          as: 'Players'
        }
      ],
      order: [
        [Slot, 'date', 'ASC'],
        [Slot, 'time', 'ASC']
      ]
    });

    const formattedMatches = matches.map(m => {
      const matchData = m.toJSON();
      return {
        id: matchData.id,
        title: matchData.title,
        description: matchData.description,
        status: matchData.status,
        min_players: matchData.min_players,
        max_players: matchData.max_players,
        open_category: matchData.open_category,
        min_category_tier: matchData.min_category_tier,
        max_category_tier: matchData.max_category_tier,
        created_at: matchData.createdAt,
        date: matchData.Slot.date,
        time: matchData.Slot.time,
        duration: matchData.Slot.duration,
        price: matchData.Slot.price,
        court_id: matchData.Slot.Court.id,
        court_name: matchData.Slot.Court.name,
        court_address: matchData.Slot.Court.address,
        creator_name: matchData.Creator.name,
        creator_category: matchData.Creator.category_tier,
        creator_avatar: matchData.Creator.avatar,
        player_count: matchData.Players.length
      };
    });

    res.json({ matches: formattedMatches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching matches' });
  }
});

// GET /api/matches/my - mis partidos
router.get('/my', auth, async (req, res) => {
  try {
    const myMatchIds = await MatchPlayer.findAll({
      where: { user_id: req.user.id },
      attributes: ['match_id']
    });

    const matchIds = myMatchIds.map(mp => mp.match_id);

    const matches = await Match.findAll({
      where: {
        [Op.or]: [
          { id: { [Op.in]: matchIds } },
          { creator_id: req.user.id }
        ]
      },
      include: [
        { model: Slot, include: [{ model: Court }] },
        { model: MatchPlayer, as: 'Players' } // Needed for player_count calculation
      ],
      order: [
        [Slot, 'date', 'DESC'],
        [Slot, 'time', 'DESC']
      ]
    });

    const formattedMatches = matches.map(m => {
      const matchData = m.toJSON();
      return {
        id: matchData.id,
        title: matchData.title,
        status: matchData.status,
        open_category: matchData.open_category,
        min_category_tier: matchData.min_category_tier,
        max_category_tier: matchData.max_category_tier,
        created_at: matchData.createdAt,
        date: matchData.Slot?.date,
        time: matchData.Slot?.time,
        duration: matchData.Slot?.duration,
        price: matchData.Slot?.price,
        court_name: matchData.Slot?.Court?.name,
        court_address: matchData.Slot?.Court?.address,
        player_count: matchData.Players.length
      };
    });

    res.json({ matches: formattedMatches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching my matches' });
  }
});

// GET /api/matches/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const match = await getMatchWithDetails(req.params.id);
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

    const matchData = match.toJSON();

    // Format response to match front-end expectations
    const formattedMatch = {
      ...matchData,
      date: matchData.Slot.date,
      time: matchData.Slot.time,
      duration: matchData.Slot.duration,
      price: matchData.Slot.price,
      open_category: matchData.open_category,
      min_category_tier: matchData.min_category_tier,
      max_category_tier: matchData.max_category_tier,
      court_id: matchData.Slot.Court.id,
      court_name: matchData.Slot.Court.name,
      venue_id: matchData.Slot.Court.Venue?.id,
      venue_name: matchData.Slot.Court.Venue?.name,
      venue_address: matchData.Slot.Court.Venue?.address,
      venue_image: matchData.Slot.Court.Venue?.image,
      court_address: matchData.Slot.Court.address,
      court_whatsapp: matchData.Slot.Court.whatsapp,
      creator_name: matchData.Creator.name,
      creator_category: matchData.Creator.category_tier,
      creator_avatar: matchData.Creator.avatar,
      players: matchData.Players.map(p => ({
        id: p.User.id,
        name: p.User.name,
        stars: p.User.stars,
        category: p.User.category_tier,
        position: p.User.position,
        avatar: p.User.avatar,
        team: p.team,
        joined_at: p.createdAt
      }))
    };

    res.json({ match: formattedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error fetching match details' });
  }
});

// POST /api/matches - crear partido
router.post('/', auth, async (req, res) => {
  try {
    const { slot_id, venue_id, date, time, title, description, min_players = 3, max_players = 4, open_category, min_category_tier, max_category_tier } = req.body;

    let resolvedSlotId = slot_id;

    if (!resolvedSlotId) {
      if (!venue_id || !date || !time) {
        return res.status(400).json({ error: 'Turno requerido' });
      }

      const candidateSlots = await Slot.findAll({
        where: {
          date,
          time,
          is_available: true
        },
        include: [{
          model: Court,
          where: { venue_id }
        }],
        order: [['id', 'ASC']]
      });

      if (candidateSlots.length === 0) {
        return res.status(400).json({ error: 'No hay turnos disponibles para esa sede y horario' });
      }

      const candidateIds = candidateSlots.map((candidateSlot) => candidateSlot.id);
      const openMatchCounts = await Match.count({
        where: {
          slot_id: { [Op.in]: candidateIds },
          status: 'open'
        },
        group: ['slot_id']
      });

      const countsBySlotId = new Map();
      if (Array.isArray(openMatchCounts)) {
        openMatchCounts.forEach((entry) => {
          countsBySlotId.set(Number(entry.slot_id), Number(entry.count));
        });
      }

      candidateSlots.sort((a, b) => {
        const aCount = countsBySlotId.get(a.id) || 0;
        const bCount = countsBySlotId.get(b.id) || 0;
        if (aCount !== bCount) return aCount - bCount;
        return a.id - b.id;
      });

      resolvedSlotId = candidateSlots[0].id;
    }

    const slot = await Slot.findOne({ where: { id: resolvedSlotId, is_available: true } });
    if (!slot) return res.status(400).json({ error: 'El turno no está disponible' });

    const existingFull = await Match.findOne({ where: { slot_id: resolvedSlotId, status: 'reserved' } });
    if (existingFull) return res.status(400).json({ error: 'Ese turno ya fue reservado' });

    const categoryRule = normalizeCategoryRule({
      open_category,
      min_category_tier,
      max_category_tier,
      creatorTier: req.user.category_tier,
    });

    const match = await Match.create({
      creator_id: req.user.id,
      slot_id: resolvedSlotId,
      title,
      description,
      min_players,
      max_players,
      open_category: categoryRule.open_category,
      min_category_tier: categoryRule.min_category_tier,
      max_category_tier: categoryRule.max_category_tier,
      status: 'open'
    });

    // Creador se une automáticamente
    await MatchPlayer.create({
      match_id: match.id,
      user_id: req.user.id
    });

    const fullMatch = await getMatchWithDetails(match.id);

    // Formatting logic...
    const matchData = fullMatch.toJSON();
    const formattedMatch = {
      ...matchData,
      date: matchData.Slot.date,
      time: matchData.Slot.time,
      duration: matchData.Slot.duration,
      price: matchData.Slot.price,
      open_category: matchData.open_category,
      min_category_tier: matchData.min_category_tier,
      max_category_tier: matchData.max_category_tier,
      court_id: matchData.Slot.Court.id,
      court_name: matchData.Slot.Court.name,
      players: matchData.Players.map(p => ({
        id: p.User.id,
        name: p.User.name,
        category: p.User.category_tier,
      }))
    };

    await emitSlotAvailabilityUpdate(resolvedSlotId, 'match_created');
    res.status(201).json({ match: formattedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error creando partido' });
  }
});

// POST /api/matches/:id/join - unirse a partido
router.post('/:id/join', auth, async (req, res) => {
  try {
    const match = await getMatchWithDetails(req.params.id);

    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (match.status !== 'open') return res.status(400).json({ error: 'El partido no está disponible' });

    if (!isUserAllowedByCategoryRule(match, req.user.category_tier)) {
      return res.status(400).json({ error: 'Tu categoria no entra en el rango permitido para este partido' });
    }

    const existing = await MatchPlayer.findOne({ where: { match_id: req.params.id, user_id: req.user.id } });
    if (existing) return res.status(400).json({ error: 'Ya estás en este partido' });

    const playerCount = match.Players.length;
    if (playerCount >= match.max_players) return res.status(400).json({ error: 'El partido está completo' });

    await MatchPlayer.create({ match_id: req.params.id, user_id: req.user.id });

    const newCount = playerCount + 1;

    // Si alcanza el mínimo → reservar turno y notificar
    if (newCount >= match.max_players) {
      await match.update({ status: 'reserved' });
      const slot = await Slot.findByPk(match.slot_id);
      await slot.update({ is_available: false });

      await Match.update(
        { status: 'cancelled' },
        {
          where: {
            slot_id: match.slot_id,
            status: 'open',
            id: { [Op.ne]: match.id }
          }
        }
      );

      // Build simplified structures for notifications
      const courtInfo = { name: match.Slot.Court.name, whatsapp: match.Slot.Court.whatsapp, address: match.Slot.Court.address };
      const slotInfo = { date: match.Slot.date, time: match.Slot.time, duration: match.Slot.duration, price: match.Slot.price };

      const newPlayersList = await MatchPlayer.findAll({
        where: { match_id: req.params.id },
        include: [{ model: User, as: 'User' }]
      });

      const playersStruct = newPlayersList.map(mp => ({ name: mp.User.name, category: mp.User.category_tier }));

      // Notificar a la cancha y al admin
      notifyCourtByWhatsApp(match, slotInfo, courtInfo, playersStruct).catch(console.error);
      notifyAdminWhatsApp(match, slotInfo, courtInfo, playersStruct).catch(console.error);
    }

    const updatedMatch = await getMatchWithDetails(req.params.id);

    // Very Basic mapping for response
    const matchData = updatedMatch.toJSON();
    const formattedMatch = {
      ...matchData,
      date: matchData.Slot.date,
      time: matchData.Slot.time,
      duration: matchData.Slot.duration,
      price: matchData.Slot.price,
      open_category: matchData.open_category,
      min_category_tier: matchData.min_category_tier,
      max_category_tier: matchData.max_category_tier,
      court_name: matchData.Slot.Court.name,
      players: matchData.Players.map(p => ({
        id: p.User.id,
        name: p.User.name,
        category: p.User.category_tier,
      }))
    };

    await emitSlotAvailabilityUpdate(match.slot_id, newCount >= match.max_players ? 'slot_reserved' : 'match_joined');
    res.json({ match: formattedMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error uniéndose al partido' });
  }
});

// DELETE /api/matches/:id/leave - salir del partido
router.delete('/:id/leave', auth, async (req, res) => {
  try {
    const match = await Match.findByPk(req.params.id);
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (match.status === 'completed') return res.status(400).json({ error: 'El partido ya finalizó' });

    await MatchPlayer.destroy({ where: { match_id: req.params.id, user_id: req.user.id } });

    const remaining = await MatchPlayer.count({ where: { match_id: req.params.id } });

    if (remaining === 0) {
      await match.update({ status: 'cancelled' });
      if (await canReopenSlot(match.slot_id)) {
        await Slot.update({ is_available: true }, { where: { id: match.slot_id } });
      }
    } else if (match.status === 'reserved') {
      await match.update({ status: 'open' });
      if (await canReopenSlot(match.slot_id)) {
        await Slot.update({ is_available: true }, { where: { id: match.slot_id } });
      }
    }

    await emitSlotAvailabilityUpdate(match.slot_id, 'match_left');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error abandonando partido' });
  }
});

// PUT /api/matches/:id/complete - marcar como completado
// THIS NOW INCORPORATES STAR MATHEMATICS for the Ranking System!
router.put('/:id/complete', auth, async (req, res) => {
  try {
    const { winners } = req.body; // array of user_ids who won
    if (!winners || !Array.isArray(winners)) {
      return res.status(400).json({ error: 'Debe proveer array winners con IDs de los ganadores' });
    }

    const match = await getMatchWithDetails(req.params.id);
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (match.creator_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede finalizar el partido' });
    if (match.status === 'completed') return res.status(400).json({ error: 'El partido ya fue finalizado' });

    // Separate players into winners and losers to calculate avg category
    const players = match.Players;
    const winningPlayers = players.filter(p => winners.includes(p.User.id));
    const losingPlayers = players.filter(p => !winners.includes(p.User.id));

    // Calculate Average Tiers per team (Remember 7 is beginners, 1 is pro)
    const winningAvgTier = winningPlayers.reduce((acc, p) => acc + p.User.category_tier, 0) / (winningPlayers.length || 1);
    const losingAvgTier = losingPlayers.reduce((acc, p) => acc + p.User.category_tier, 0) / (losingPlayers.length || 1);

    // Apply Star Rating Updates for each player
    for (const player of players) {
      const isWinner = winners.includes(player.User.id);
      const resultStr = isWinner ? 'win' : 'loss';

      let starsEarned = 0;
      if (isWinner) {
        starsEarned = calculateStarsEarned(winningAvgTier, losingAvgTier, 'win');
      } else {
        starsEarned = calculateStarsEarned(losingAvgTier, winningAvgTier, 'loss');
      }

      const user = await User.findByPk(player.User.id);
      user.stars = Math.max(0, user.stars + starsEarned); // Cant go sub-zero
      user.category_tier = categoryFromStars(user.stars); // Update category based on stars
      user.matches_played += 1;

      if (isWinner) user.wins += 1;
      else user.losses += 1;

      await user.save();

      // Update MatchPlayer with result and stars earned
      await MatchPlayer.update(
        { result: resultStr, stars_earned: starsEarned },
        { where: { id: player.id } }
      );
    }

    await match.update({ status: 'completed' });

    res.json({ success: true, message: 'Partido completado y estrellas calculadas exitosamente.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al finalizar el partido' });
  }
});

module.exports = router;
