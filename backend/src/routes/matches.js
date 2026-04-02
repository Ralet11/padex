const express = require('express');
const { Op } = require('sequelize');
const { Match, Slot, Court, Venue, User, MatchPlayer, sequelize } = require('../models');
const auth = require('../middleware/auth');
const { notifyCourtByWhatsApp, notifyAdminWhatsApp } = require('../services/notifications');
const { nameFromTier } = require('../services/elo');
const { dateToStr } = require('../services/availability');
const { emitVenueAvailabilityUpdate } = require('../services/realtime');
const { applyCompetitiveCompletion, normalizeCompletionPayload } = require('../services/competitive/progression');
const {
  buildActiveMatchWhere,
  updateMatchLifecycle,
  updateSlotLifecycle,
  releaseSlotIfManagedByApp,
  canAssignCompetitiveSeason,
  assertCompetitiveCompletionLifecycle,
} = require('../services/competitive/matchLifecycle');
const { getActiveSeasonForLeague } = require('../services/competitive/seasons');
const { MATCH_STATES } = require('../constants/matchStates');
const { SLOT_STATES } = require('../constants/slotStates');
const { getCanonicalSideForIndex } = require('../services/competitive/teams');

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

function resolveAuthoritativeTier(user = {}) {
  return Number(user.competitive_context?.tier || user.competitive_tier || user.category_tier || 0);
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

async function getMatchWithDetails(matchId, options = {}) {
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
      },
      {
        association: 'CompetitiveResult'
      }
    ],
    transaction: options.transaction,
  });
}

function formatMatchResponse(match) {
  const matchData = match.toJSON();

  return {
    ...matchData,
    state: matchData.state,
    slot_state: matchData.Slot?.state || null,
    date: matchData.Slot?.date,
    time: matchData.Slot?.time,
    duration: matchData.Slot?.duration,
    price: matchData.Slot?.price,
    open_category: matchData.open_category,
    min_category_tier: matchData.min_category_tier,
    max_category_tier: matchData.max_category_tier,
    court_id: matchData.Slot?.Court?.id,
    court_name: matchData.Slot?.Court?.name,
    venue_id: matchData.Slot?.Court?.Venue?.id,
    venue_name: matchData.Slot?.Court?.Venue?.name,
    venue_address: matchData.Slot?.Court?.Venue?.address,
    venue_image: matchData.Slot?.Court?.Venue?.image,
    court_address: matchData.Slot?.Court?.address,
    court_whatsapp: matchData.Slot?.Court?.whatsapp,
    creator_name: matchData.Creator?.name,
    creator_category: matchData.Creator?.category_tier,
    creator_avatar: matchData.Creator?.avatar,
    canonical_completion: matchData.CompetitiveResult
      ? {
          schema_version: 1,
          winning_side: matchData.CompetitiveResult.winning_side,
          score: Array.isArray(matchData.CompetitiveResult.score) ? matchData.CompetitiveResult.score : [],
          recorded_by: matchData.CompetitiveResult.recorded_by,
          source: matchData.CompetitiveResult.source_surface,
          recorded_at: matchData.CompetitiveResult.recorded_at,
        }
      : null,
    players: (matchData.Players || []).map((player) => ({
      id: player.User?.id,
      name: player.User?.name,
      stars: player.User?.stars,
      category: player.User?.category_tier,
      position: player.User?.position,
      avatar: player.User?.avatar,
      team: player.team,
      joined_at: player.createdAt,
      competitive_result: player.competitive_result,
      stars_earned: player.stars_earned,
      rating_delta: player.rating_delta,
      progression_points_delta: player.progression_points_delta,
    })),
  };
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

    const whereRules = buildActiveMatchWhere({ state: MATCH_STATES.OPEN });
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
      whereRules[Op.and] = [
        {
          [Op.or]: [
            { open_category: true },
            {
              open_category: false,
              min_category_tier: { [Op.lte]: categoryTier },
              max_category_tier: { [Op.gte]: categoryTier },
            },
          ]
        }
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
        state: matchData.state,
        min_players: matchData.min_players,
        max_players: matchData.max_players,
        open_category: matchData.open_category,
        min_category_tier: matchData.min_category_tier,
        max_category_tier: matchData.max_category_tier,
        created_at: matchData.createdAt,
        date: matchData.Slot.date,
        time: matchData.Slot.time,
        slot_state: matchData.Slot.state,
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
        state: matchData.state,
        open_category: matchData.open_category,
        min_category_tier: matchData.min_category_tier,
        max_category_tier: matchData.max_category_tier,
        created_at: matchData.createdAt,
        date: matchData.Slot?.date,
        time: matchData.Slot?.time,
        slot_state: matchData.Slot?.state,
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

    res.json({ match: formatMatchResponse(match) });
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
        where: buildActiveMatchWhere({
          slot_id: { [Op.in]: candidateIds },
          state: MATCH_STATES.OPEN,
        }),
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

    const existingFull = await Match.findOne({ where: buildActiveMatchWhere({ slot_id: resolvedSlotId, state: MATCH_STATES.RESERVED }) });
    if (existingFull) return res.status(400).json({ error: 'Ese turno ya fue reservado' });

    const activeSeason = canAssignCompetitiveSeason(slot)
      ? await getActiveSeasonForLeague(req.user.league_id)
      : null;

    const categoryRule = normalizeCategoryRule({
      open_category,
      min_category_tier,
      max_category_tier,
      creatorTier: resolveAuthoritativeTier(req.user),
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
      state: MATCH_STATES.OPEN,
      competitive_season_id: activeSeason?.id || null,
    });

    // Creador se une automáticamente
    await MatchPlayer.create({
      match_id: match.id,
      user_id: req.user.id,
      team: getCanonicalSideForIndex(0, max_players),
    });

    const fullMatch = await getMatchWithDetails(match.id);

    await emitSlotAvailabilityUpdate(resolvedSlotId, 'match_created');
    res.status(201).json({ match: formatMatchResponse(fullMatch) });
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
    if (match.state !== MATCH_STATES.OPEN) return res.status(400).json({ error: 'El partido no está disponible' });

    if (!isUserAllowedByCategoryRule(match, resolveAuthoritativeTier(req.user))) {
      return res.status(400).json({ error: 'Tu categoria no entra en el rango permitido para este partido' });
    }

    const existing = await MatchPlayer.findOne({ where: { match_id: req.params.id, user_id: req.user.id } });
    if (existing) return res.status(400).json({ error: 'Ya estás en este partido' });

    const playerCount = match.Players.length;
    if (playerCount >= match.max_players) return res.status(400).json({ error: 'El partido está completo' });

    await MatchPlayer.create({
      match_id: req.params.id,
      user_id: req.user.id,
      team: getCanonicalSideForIndex(playerCount, match.max_players),
    });

    const newCount = playerCount + 1;

    // Si alcanza el mínimo → reservar turno y notificar
    if (newCount >= match.max_players) {
      await updateMatchLifecycle(match, MATCH_STATES.RESERVED);
      const slot = await Slot.findByPk(match.slot_id);
      await updateSlotLifecycle(slot, SLOT_STATES.RESERVED);

      await Match.update(
        { state: MATCH_STATES.CANCELLED },
        {
          where: buildActiveMatchWhere({
            slot_id: match.slot_id,
            state: MATCH_STATES.OPEN,
            id: { [Op.ne]: match.id }
          })
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
    await emitSlotAvailabilityUpdate(match.slot_id, newCount >= match.max_players ? 'slot_reserved' : 'match_joined');
    res.json({ match: formatMatchResponse(updatedMatch) });
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
    if (match.state === MATCH_STATES.COMPLETED) return res.status(400).json({ error: 'El partido ya finalizó' });

    await MatchPlayer.destroy({ where: { match_id: req.params.id, user_id: req.user.id } });

    const remaining = await MatchPlayer.count({ where: { match_id: req.params.id } });

    if (remaining === 0) {
      await updateMatchLifecycle(match, MATCH_STATES.CANCELLED);
      if (await canReopenSlot(match.slot_id)) {
        const slot = await Slot.findByPk(match.slot_id);
        await releaseSlotIfManagedByApp(slot);
      }
    } else if (match.state === MATCH_STATES.RESERVED) {
      await updateMatchLifecycle(match, MATCH_STATES.OPEN);
      if (await canReopenSlot(match.slot_id)) {
        const slot = await Slot.findByPk(match.slot_id);
        await releaseSlotIfManagedByApp(slot);
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
    const normalizedPayload = normalizeCompletionPayload({ Players: [] }, req.body);
    if (!Array.isArray(req.body.winners) && !normalizedPayload.has_canonical_result && !req.body.winning_side && !req.body.result?.winning_side) {
      return res.status(400).json({ error: 'Debe proveer winners o un payload canonico de finalizacion' });
    }

    const match = await getMatchWithDetails(req.params.id);
    if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
    if (match.creator_id !== req.user.id) return res.status(403).json({ error: 'Solo el creador puede finalizar el partido' });
    if (match.state === MATCH_STATES.COMPLETED) return res.status(400).json({ error: 'El partido ya fue finalizado' });

    const completion = await sequelize.transaction(async (transaction) => {
      const lockedMatch = await getMatchWithDetails(req.params.id, { transaction });
      const slot = await Slot.findByPk(lockedMatch.slot_id, { transaction });

      assertCompetitiveCompletionLifecycle(lockedMatch, slot);

      const result = await applyCompetitiveCompletion({
        match: lockedMatch,
        completedBy: req.user,
        payload: req.body,
        transaction,
      });

      await updateMatchLifecycle(lockedMatch, MATCH_STATES.COMPLETED, { transaction });

      if (slot && !slot.booked_externally) {
        await updateSlotLifecycle(slot, SLOT_STATES.COMPLETED, { transaction });
      }

      return result;
    });

    const completedMatch = await getMatchWithDetails(req.params.id);

    res.json({
      success: true,
      message: 'Partido completado y resultado competitivo registrado.',
      match: formatMatchResponse(completedMatch),
      canonical_completion: completion.normalized,
      season_context: completion.season_context,
      player_updates: completion.player_updates,
    });
  } catch (err) {
    if (err.message === 'Debe proveer un ganador valido para completar el partido'
      || err.message === 'El resultado competitivo debe incluir ganadores y perdedores'
      || err.message === 'El lado ganador no coincide con los jugadores marcados como ganadores'
      || err.message === 'No se pudo determinar el lado ganador canonico del partido'
      || err.code === 'INVALID_LIFECYCLE_TRANSITION') {
      return res.status(400).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al finalizar el partido' });
  }
});

module.exports = router;
