require('dotenv').config();

const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Venue,
  Court,
  Slot,
  Match,
  MatchPlayer,
  AvailabilityRule,
} = require('../models');
const { ensureSlotsForRange, dateToStr } = require('../services/availability');
const { nameFromTier } = require('../services/elo');

const TARGET_TOTAL_VENUES = 5;
const TARGET_DEMO_PLAYERS = 25;
const TARGET_OPEN_MATCHES = 24;
const DEMO_PASSWORD = 'PadexDemo123!';
const DEMO_MATCH_PREFIX = 'Demo Match';

const PLAYER_FIRST_NAMES = ['Mateo', 'Lautaro', 'Santiago', 'Tomas', 'Valentin'];
const PLAYER_LAST_NAMES = ['Rossi', 'Pereyra', 'Gomez', 'Molina', 'Acosta'];
const PADDLE_BRANDS = ['Bullpadel', 'Nox', 'Babolat', 'Adidas', 'Head'];
const PLAYER_TIERS = [7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 7, 6, 5, 4, 3, 2, 1, 7, 6, 5, 4, 3];

const DEMO_VENUE_TEMPLATES = [
  {
    key: 'palermo',
    manager: { name: 'Manager Palermo', email: 'demo.manager.01@padex.local' },
    venue: {
      name: 'Padex Demo - Palermo',
      address: 'Honduras 4988, Palermo, Buenos Aires',
      phone: '+54 11 5010 1101',
      price_per_slot: 24000,
      services: ['wifi', 'vestuario', 'estacionamiento'],
      image: 'https://placehold.co/1200x900/0B0B0B/A7CE29?text=Padex+Palermo',
    },
    courts: [
      { name: 'Cancha 1 Central', type: 'Cristal', surface: 'sintetico', enclosure: 'cubierta' },
      { name: 'Cancha 2 Bosque', type: 'Panoramica', surface: 'parquet', enclosure: 'cubierta' },
      { name: 'Cancha 3 Terraza', type: 'Muro', surface: 'cemento', enclosure: 'descubierta' },
    ],
  },
  {
    key: 'belgrano',
    manager: { name: 'Manager Belgrano', email: 'demo.manager.02@padex.local' },
    venue: {
      name: 'Padex Demo - Belgrano',
      address: 'Av. Cabildo 2876, Belgrano, Buenos Aires',
      phone: '+54 11 5010 1102',
      price_per_slot: 21000,
      services: ['wifi', 'gimnasio', 'vestuario'],
      image: 'https://placehold.co/1200x900/111111/FFFFFF?text=Padex+Belgrano',
    },
    courts: [
      { name: 'Cancha 1 Norte', type: 'Cristal', surface: 'sintetico', enclosure: 'cubierta' },
      { name: 'Cancha 2 Club', type: 'Muro', surface: 'flotante', enclosure: 'cubierta' },
      { name: 'Cancha 3 Patio', type: 'Panoramica', surface: 'cemento', enclosure: 'descubierta' },
    ],
  },
  {
    key: 'caballito',
    manager: { name: 'Manager Caballito', email: 'demo.manager.03@padex.local' },
    venue: {
      name: 'Padex Demo - Caballito',
      address: 'Av. Pedro Goyena 742, Caballito, Buenos Aires',
      phone: '+54 11 5010 1103',
      price_per_slot: 19500,
      services: ['wifi', 'vestuario', 'parrillas'],
      image: 'https://placehold.co/1200x900/151515/A7CE29?text=Padex+Caballito',
    },
    courts: [
      { name: 'Cancha 1 Arena', type: 'Muro', surface: 'cemento', enclosure: 'descubierta' },
      { name: 'Cancha 2 Indoor', type: 'Cristal', surface: 'sintetico', enclosure: 'cubierta' },
      { name: 'Cancha 3 Flex', type: 'Panoramica', surface: 'parquet', enclosure: 'cubierta' },
    ],
  },
  {
    key: 'vicente-lopez',
    manager: { name: 'Manager Vicente Lopez', email: 'demo.manager.04@padex.local' },
    venue: {
      name: 'Padex Demo - Vicente Lopez',
      address: 'Av. del Libertador 1800, Vicente Lopez, Buenos Aires',
      phone: '+54 11 5010 1104',
      price_per_slot: 26000,
      services: ['wifi', 'estacionamiento', 'gimnasio'],
      image: 'https://placehold.co/1200x900/0E141B/A7CE29?text=Padex+VL',
    },
    courts: [
      { name: 'Cancha 1 Rio', type: 'Panoramica', surface: 'parquet', enclosure: 'cubierta' },
      { name: 'Cancha 2 Vista', type: 'Cristal', surface: 'sintetico', enclosure: 'cubierta' },
      { name: 'Cancha 3 Open', type: 'Muro', surface: 'cesped_natural', enclosure: 'descubierta' },
    ],
  },
  {
    key: 'quilmes',
    manager: { name: 'Manager Quilmes', email: 'demo.manager.05@padex.local' },
    venue: {
      name: 'Padex Demo - Quilmes',
      address: 'Av. Calchaqui 3200, Quilmes, Buenos Aires',
      phone: '+54 11 5010 1105',
      price_per_slot: 17500,
      services: ['wifi', 'vestuario', 'parrillas', 'estacionamiento'],
      image: 'https://placehold.co/1200x900/101820/FFFFFF?text=Padex+Quilmes',
    },
    courts: [
      { name: 'Cancha 1 Plaza', type: 'Cristal', surface: 'flotante', enclosure: 'cubierta' },
      { name: 'Cancha 2 Sur', type: 'Muro', surface: 'cemento', enclosure: 'descubierta' },
      { name: 'Cancha 3 Green', type: 'Panoramica', surface: 'sintetico', enclosure: 'cubierta' },
    ],
  },
];

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function starsForTier(tier) {
  const map = {
    7: 220,
    6: 620,
    5: 980,
    4: 1380,
    3: 1780,
    2: 2180,
    1: 2580,
  };

  return map[tier] || 220;
}

function slugFromTier(tier) {
  return nameFromTier(tier).split(' ')[0].toLowerCase();
}

function buildPlayerTemplates() {
  const names = [];
  PLAYER_FIRST_NAMES.forEach((firstName) => {
    PLAYER_LAST_NAMES.forEach((lastName) => {
      names.push(`${firstName} ${lastName}`);
    });
  });

  return names.slice(0, TARGET_DEMO_PLAYERS).map((name, index) => {
    const tier = PLAYER_TIERS[index] || 7;
    const padded = String(index + 1).padStart(2, '0');
    const tierName = slugFromTier(tier);

    return {
      name,
      email: `demo.player.${padded}@padex.local`,
      position: index % 2 === 0 ? 'drive' : 'reves',
      paddle_brand: PADDLE_BRANDS[index % PADDLE_BRANDS.length],
      bio: `Jugador demo ${tierName} para poblar la app.`,
      stars: starsForTier(tier),
      category_tier: tier,
      category: tierName,
      self_category: tierName,
      avatar: `https://placehold.co/400x400/0B0B0B/A7CE29?text=${encodeURIComponent(name.split(' ')[0])}`,
      role: 'player',
    };
  });
}

function buildCourtImage(venueKey, courtName) {
  return `https://placehold.co/1200x900/101010/A7CE29?text=${encodeURIComponent(`${venueKey} ${courtName}`)}`;
}

async function ensureManager(managerTemplate) {
  const [manager] = await User.findOrCreate({
    where: { email: managerTemplate.email },
    defaults: {
      name: managerTemplate.name,
      password: DEMO_PASSWORD,
      role: 'partner',
    },
  });

  if (manager.name !== managerTemplate.name || manager.role !== 'partner') {
    await manager.update({
      name: managerTemplate.name,
      role: 'partner',
    });
  }

  return manager;
}

async function ensureVenue(venueTemplate) {
  const manager = await ensureManager(venueTemplate.manager);
  const [venue] = await Venue.findOrCreate({
    where: { name: venueTemplate.venue.name },
    defaults: {
      ...venueTemplate.venue,
      manager_id: manager.id,
    },
  });

  await venue.update({
    ...venueTemplate.venue,
    manager_id: manager.id,
  });

  const courts = [];
  for (const courtTemplate of venueTemplate.courts) {
    const [court] = await Court.findOrCreate({
      where: {
        venue_id: venue.id,
        name: courtTemplate.name,
      },
      defaults: {
        venue_id: venue.id,
        name: courtTemplate.name,
        type: courtTemplate.type,
        image: buildCourtImage(venueTemplate.key, courtTemplate.name),
        surface: courtTemplate.surface,
        enclosure: courtTemplate.enclosure,
      },
    });

    await court.update({
      type: courtTemplate.type,
      image: buildCourtImage(venueTemplate.key, courtTemplate.name),
      surface: courtTemplate.surface,
      enclosure: courtTemplate.enclosure,
    });

    courts.push(court);
  }

  const today = new Date();
  const startDate = dateToStr(today);
  const endDate = dateToStr(addDays(today, 60));
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  const windows = [
    { start_time: '08:00', end_time: '14:00' },
    { start_time: '17:00', end_time: '23:00' },
  ];

  const activeRule = await AvailabilityRule.findOne({
    where: {
      venue_id: venue.id,
      is_active: true,
    },
    order: [['id', 'ASC']],
  });

  if (activeRule) {
    await activeRule.update({
      court_ids: courts.map((court) => court.id),
      weekdays,
      windows,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    });
  } else {
    await AvailabilityRule.create({
      venue_id: venue.id,
      court_ids: courts.map((court) => court.id),
      weekdays,
      windows,
      start_date: startDate,
      end_date: endDate,
      is_active: true,
    });
  }

  await ensureSlotsForRange(venue.id, startDate, dateToStr(addDays(today, 21)));

  return { venue, courts };
}

async function ensureDemoVenues() {
  const totalVenueCount = await Venue.count();
  const existingVenueNames = new Set(
    (await Venue.findAll({
      attributes: ['name'],
      where: {
        name: {
          [Op.in]: DEMO_VENUE_TEMPLATES.map((item) => item.venue.name),
        },
      },
    })).map((venue) => venue.name)
  );

  const missingTotal = Math.max(0, TARGET_TOTAL_VENUES - totalVenueCount);
  const templatesToCreate = [];

  for (const template of DEMO_VENUE_TEMPLATES) {
    if (templatesToCreate.length >= missingTotal) break;
    if (!existingVenueNames.has(template.venue.name)) {
      templatesToCreate.push(template);
    }
  }

  const templatesToEnsure = DEMO_VENUE_TEMPLATES.filter((template) => existingVenueNames.has(template.venue.name))
    .concat(templatesToCreate);

  const ensured = [];
  for (const template of templatesToEnsure) {
    ensured.push(await ensureVenue(template));
  }

  return ensured;
}

async function ensureDemoPlayers() {
  const playerTemplates = buildPlayerTemplates();
  const players = [];

  for (const template of playerTemplates) {
    const [player] = await User.findOrCreate({
      where: { email: template.email },
      defaults: {
        ...template,
        password: DEMO_PASSWORD,
      },
    });

    await player.update({
      name: template.name,
      avatar: template.avatar,
      position: template.position,
      paddle_brand: template.paddle_brand,
      bio: template.bio,
      stars: template.stars,
      category_tier: template.category_tier,
      category: template.category,
      self_category: template.self_category,
      role: 'player',
    });

    players.push(player);
  }

  return players;
}

function shuffle(values) {
  const list = [...values];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [list[i], list[randomIndex]] = [list[randomIndex], list[i]];
  }
  return list;
}

function buildCategoryRuleForMatch(index, creatorTier) {
  if (index % 4 === 0) {
    return {
      open_category: true,
      min_category_tier: 1,
      max_category_tier: 7,
    };
  }

  if (index % 4 === 1) {
    return {
      open_category: false,
      min_category_tier: creatorTier,
      max_category_tier: creatorTier,
    };
  }

  if (index % 4 === 2) {
    return {
      open_category: false,
      min_category_tier: Math.max(1, creatorTier - 1),
      max_category_tier: Math.min(7, creatorTier + 1),
    };
  }

  return {
    open_category: false,
    min_category_tier: Math.max(1, creatorTier - 2),
    max_category_tier: Math.min(7, creatorTier + 1),
  };
}

function pickEligiblePlayers(players, categoryRule, creatorId) {
  return players.filter((player) => {
    if (player.id === creatorId) return false;
    if (categoryRule.open_category) return true;
    return player.category_tier >= categoryRule.min_category_tier
      && player.category_tier <= categoryRule.max_category_tier;
  });
}

async function getCandidateSlots(demoVenueIds) {
  if (demoVenueIds.length === 0) return [];

  const courts = await Court.findAll({
    where: {
      venue_id: {
        [Op.in]: demoVenueIds,
      },
    },
    attributes: ['id'],
  });

  const courtIds = courts.map((court) => court.id);
  if (courtIds.length === 0) return [];

  const activeMatches = await Match.findAll({
    where: {
      status: {
        [Op.in]: ['open', 'reserved'],
      },
    },
    attributes: ['slot_id'],
  });

  const usedSlotIds = activeMatches
    .map((match) => match.slot_id)
    .filter(Boolean);

  const today = new Date();
  const from = dateToStr(today);
  const to = dateToStr(addDays(today, 14));

  return Slot.findAll({
    where: {
      court_id: {
        [Op.in]: courtIds,
      },
      date: {
        [Op.between]: [from, to],
      },
      is_available: true,
      booked_externally: false,
      ...(usedSlotIds.length > 0 ? {
        id: {
          [Op.notIn]: usedSlotIds,
        },
      } : {}),
    },
    order: [['date', 'ASC'], ['time', 'ASC'], ['court_id', 'ASC']],
  });
}

async function getPlayableVenueIds(preferredVenueIds = []) {
  const activeRules = await AvailabilityRule.findAll({
    where: {
      is_active: true,
    },
    attributes: ['venue_id'],
  });

  const venueIds = new Set(preferredVenueIds);
  activeRules.forEach((rule) => {
    if (rule.venue_id) {
      venueIds.add(rule.venue_id);
    }
  });

  const today = new Date();
  const from = dateToStr(today);
  const to = dateToStr(addDays(today, 14));

  for (const venueId of venueIds) {
    await ensureSlotsForRange(venueId, from, to);
  }

  return [...venueIds];
}

async function ensureDemoMatches(players, ensuredVenues) {
  const openDemoMatchCount = await Match.count({
    where: {
      status: 'open',
      title: {
        [Op.iLike]: `${DEMO_MATCH_PREFIX}%`,
      },
    },
  });

  const missingMatches = Math.max(0, TARGET_OPEN_MATCHES - openDemoMatchCount);
  if (missingMatches === 0) {
    return { created: 0 };
  }

  const demoVenueIds = ensuredVenues.map((item) => item.venue.id);
  const playableVenueIds = await getPlayableVenueIds(demoVenueIds);
  const candidateSlots = shuffle(await getCandidateSlots(playableVenueIds));
  const maxMatchesToCreate = Math.min(missingMatches, candidateSlots.length);
  const createdMatches = [];

  for (let index = 0; index < maxMatchesToCreate; index += 1) {
    const slot = candidateSlots[index];
    const creator = players[index % players.length];
    const categoryRule = buildCategoryRuleForMatch(index, creator.category_tier);
    const eligiblePlayers = shuffle(pickEligiblePlayers(players, categoryRule, creator.id));
    const extraPlayersCount = index % 3;
    const extraPlayers = eligiblePlayers.slice(0, extraPlayersCount);
    const matchNumber = String(openDemoMatchCount + index + 1).padStart(2, '0');

    const transaction = await sequelize.transaction();
    try {
      const match = await Match.create({
        creator_id: creator.id,
        slot_id: slot.id,
        title: `${DEMO_MATCH_PREFIX} ${matchNumber}`,
        description: 'Partido demo generado automaticamente para poblar la app.',
        status: 'open',
        min_players: 4,
        max_players: 4,
        open_category: categoryRule.open_category,
        min_category_tier: categoryRule.min_category_tier,
        max_category_tier: categoryRule.max_category_tier,
      }, { transaction });

      await MatchPlayer.create({
        match_id: match.id,
        user_id: creator.id,
      }, { transaction });

      for (const player of extraPlayers) {
        await MatchPlayer.create({
          match_id: match.id,
          user_id: player.id,
        }, { transaction });
      }

      await transaction.commit();
      createdMatches.push(match);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  return { created: createdMatches.length };
}

async function seedDemoData() {
  console.log('[seed:demo] syncing models...');
  await sequelize.authenticate();
  await sequelize.sync({ alter: true });

  const ensuredVenues = await ensureDemoVenues();
  console.log(`[seed:demo] ensured demo venues: ${ensuredVenues.length}`);

  const players = await ensureDemoPlayers();
  console.log(`[seed:demo] ensured demo players: ${players.length}`);

  const matchResult = await ensureDemoMatches(players, ensuredVenues);
  console.log(`[seed:demo] created open demo matches: ${matchResult.created}`);

  const totalVenueCount = await Venue.count();
  const totalDemoPlayers = await User.count({
    where: {
      email: {
        [Op.iLike]: 'demo.player.%@padex.local',
      },
    },
  });
  const totalOpenDemoMatches = await Match.count({
    where: {
      status: 'open',
      title: {
        [Op.iLike]: `${DEMO_MATCH_PREFIX}%`,
      },
    },
  });

  console.log('[seed:demo] done');
  console.log(`[seed:demo] total venues in db: ${totalVenueCount}`);
  console.log(`[seed:demo] total demo players: ${totalDemoPlayers}`);
  console.log(`[seed:demo] total open demo matches: ${totalOpenDemoMatches}`);
}

async function main() {
  try {
    await seedDemoData();
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('[seed:demo] failed:', error);
    await sequelize.close().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  seedDemoData,
};
