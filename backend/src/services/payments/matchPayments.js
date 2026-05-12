const { Op } = require('sequelize');
const {
  Match,
  Slot,
  Court,
  Venue,
  User,
  MatchPlayer,
  MatchPayment,
  sequelize,
} = require('../../models');
const {
  MATCH_PAYMENT_CONFIG,
  MATCH_PAYMENT_ROLES,
  MATCH_PAYMENT_STATUSES,
} = require('../../constants/matchPayments');
const { MATCH_STATES } = require('../../constants/matchStates');
const { SLOT_STATES } = require('../../constants/slotStates');
const {
  updateMatchLifecycle,
  updateSlotLifecycle,
  canAssignCompetitiveSeason,
} = require('../competitive/matchLifecycle');
const { notifyCourtByWhatsApp, notifyAdminWhatsApp } = require('../notifications');
const { getActiveSeasonForLeague } = require('../competitive/seasons');
const { getCanonicalSideForIndex } = require('../competitive/teams');
const { getPlayerPaymentQuote } = require('../matchPricing');
const { createCheckoutSession, fetchProviderPayment, refundProviderPayment } = require('./provider');

function createPublicError(message, status = 400, code = 'MATCH_PAYMENT_ERROR') {
  const error = new Error(message);
  error.status = status;
  error.publicMessage = message;
  error.code = code;
  return error;
}

function addMinutes(date, minutes) {
  return new Date(date.getTime() + (minutes * 60 * 1000));
}

function combineSlotDateTime(slot) {
  return new Date(`${slot.date}T${slot.time}:00`);
}

function getIncompleteCancellationDeadline(slot) {
  const slotDateTime = combineSlotDateTime(slot);
  return new Date(slotDateTime.getTime() - (MATCH_PAYMENT_CONFIG.incomplete_cancel_hours * 60 * 60 * 1000));
}

function buildExternalReference(payment) {
  return `padex-match-${payment.match_id}-user-${payment.user_id}-payment-${payment.id}`;
}

function normalizeMoneyAmount(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount * 100) / 100;
}

async function loadVenueFallbackPriceForSlot(slot, transaction) {
  if (!slot?.court_id) return 0;

  const court = await Court.findByPk(slot.court_id, {
    attributes: ['id', 'venue_id'],
    transaction,
  });
  if (!court?.venue_id) return 0;

  const venue = await Venue.findByPk(court.venue_id, {
    attributes: ['id', 'price_per_slot'],
    transaction,
  });

  return normalizeMoneyAmount(venue?.price_per_slot);
}

async function ensureChargeableSlotPrice(slot, transaction) {
  const currentSlotPrice = normalizeMoneyAmount(slot?.price);
  if (currentSlotPrice > 0) {
    return currentSlotPrice;
  }

  const fallbackVenuePrice = await loadVenueFallbackPriceForSlot(slot, transaction);
  if (!(fallbackVenuePrice > 0)) {
    throw createPublicError('La sede no tiene un precio configurado para este turno', 400, 'INVALID_SLOT_PRICE');
  }

  if (slot && currentSlotPrice !== fallbackVenuePrice) {
    await slot.update({ price: fallbackVenuePrice }, { transaction });
    slot.price = fallbackVenuePrice;
  }

  return fallbackVenuePrice;
}

function isTerminalStatus(status) {
  return [
    MATCH_PAYMENT_STATUSES.APPROVED,
    MATCH_PAYMENT_STATUSES.REJECTED,
    MATCH_PAYMENT_STATUSES.CANCELLED,
    MATCH_PAYMENT_STATUSES.EXPIRED,
    MATCH_PAYMENT_STATUSES.REFUNDED,
  ].includes(status);
}

function normalizeMatchStateForPendingAccess(match) {
  return [MATCH_STATES.DRAFT, MATCH_STATES.OPEN, MATCH_STATES.RESERVED, MATCH_STATES.IN_PROGRESS].includes(match?.state);
}

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

function resolveAuthoritativeTier(user = {}) {
  return Number(user.competitive_context?.tier || user.competitive_tier || user.category_tier || 0);
}

function isUserAllowedByCategoryRule(match, userTier) {
  if (match.open_category) return true;
  return userTier >= match.min_category_tier && userTier <= match.max_category_tier;
}

async function resolveSlotId({ slot_id, venue_id, date, time }, transaction) {
  let resolvedSlotId = slot_id;

  if (resolvedSlotId) return resolvedSlotId;

  if (!venue_id || !date || !time) {
    throw createPublicError('Turno requerido');
  }

  const candidateSlots = await Slot.findAll({
    where: {
      date,
      time,
      is_available: true,
    },
    include: [{
      model: Court,
      where: { venue_id },
    }],
    order: [['id', 'ASC']],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  if (candidateSlots.length === 0) {
    throw createPublicError('No hay turnos disponibles para esa sede y horario');
  }

  resolvedSlotId = candidateSlots[0].id;
  return resolvedSlotId;
}

async function loadPaymentAggregate(paymentId) {
  return MatchPayment.findByPk(paymentId, {
    include: [
      {
        model: Match,
        as: 'Match',
        include: [{
          model: Slot,
          as: 'Slot',
          include: [{
            model: Court,
            include: [{ model: Venue, attributes: ['id', 'name', 'address', 'image'] }],
          }],
        }],
      },
      { model: User, as: 'User', attributes: ['id', 'email', 'name'] },
    ],
  });
}

async function buildCheckoutResponse(paymentId) {
  const payment = await loadPaymentAggregate(paymentId);
  return {
    payment: {
      id: payment.id,
      status: payment.status,
      role: payment.role,
      provider: payment.provider,
      total_amount: payment.total_amount,
      base_amount: payment.base_amount,
      extra_amount: payment.extra_amount,
      currency: payment.currency,
      position_index: payment.position_index,
      checkout_url: payment.checkout_url,
      sandbox_checkout_url: payment.sandbox_checkout_url,
      expires_at: payment.expires_at,
      match_id: payment.match_id,
      slot_id: payment.slot_id,
    },
    match: payment.Match,
  };
}

async function attachCheckoutSession(paymentId) {
  const payment = await loadPaymentAggregate(paymentId);
  const session = await createCheckoutSession({
    payment,
    match: payment.Match,
    slot: payment.Match?.Slot,
    payer: payment.User,
  });

  await payment.update({
    provider_preference_id: session.provider_preference_id || payment.provider_preference_id,
    checkout_url: session.checkout_url || null,
    sandbox_checkout_url: session.sandbox_checkout_url || null,
    provider_payload: session.provider_payload || null,
  });

  return buildCheckoutResponse(paymentId);
}

async function triggerReservationNotifications(matchId) {
  const match = await Match.findByPk(matchId, {
    include: [
      {
        model: Slot,
        include: [{
          model: Court,
          include: [{ model: Venue, attributes: ['id', 'name', 'address', 'image'] }],
        }],
      },
      {
        model: MatchPlayer,
        as: 'Players',
        include: [{ model: User, as: 'User', attributes: ['name', 'category_tier'] }],
      },
    ],
  });

  if (!match?.Slot?.Court) return;

  const courtInfo = {
    name: match.Slot.Court.name,
    whatsapp: match.Slot.Court.whatsapp,
    address: match.Slot.Court.address,
  };

  const slotInfo = {
    date: match.Slot.date,
    time: match.Slot.time,
    duration: match.Slot.duration,
    price: match.Slot.price,
  };

  const playersStruct = (match.Players || []).map((player) => ({
    name: player.User?.name,
    category: player.User?.category_tier,
  }));

  notifyCourtByWhatsApp(match, slotInfo, courtInfo, playersStruct).catch(console.error);
  notifyAdminWhatsApp(match, slotInfo, courtInfo, playersStruct).catch(console.error);
}

async function createCreatorPaymentIntent({ requester, payload }) {
  const creator = await User.findByPk(requester.id);
  if (!creator) throw createPublicError('Usuario no encontrado', 404);

  const payment = await sequelize.transaction(async (transaction) => {
    const resolvedSlotId = await resolveSlotId(payload, transaction);
    const slot = await Slot.findOne({
      where: { id: resolvedSlotId, is_available: true },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!slot) throw createPublicError('El turno no esta disponible');
    const chargeableSlotPrice = await ensureChargeableSlotPrice(slot, transaction);

    const conflictingMatch = await Match.findOne({
      where: {
        slot_id: resolvedSlotId,
        payment_required: true,
        state: { [Op.in]: [MATCH_STATES.DRAFT, MATCH_STATES.OPEN, MATCH_STATES.RESERVED, MATCH_STATES.IN_PROGRESS] },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (conflictingMatch) {
      throw createPublicError('Ese turno ya esta comprometido por otro partido');
    }

    const activeSeason = canAssignCompetitiveSeason(slot)
      ? await getActiveSeasonForLeague(requester.league_id)
      : null;

    const categoryRule = normalizeCategoryRule({
      open_category: payload.open_category,
      min_category_tier: payload.min_category_tier,
      max_category_tier: payload.max_category_tier,
      creatorTier: resolveAuthoritativeTier(requester),
    });

    const match = await Match.create({
      creator_id: requester.id,
      slot_id: resolvedSlotId,
      title: payload.title,
      description: payload.description,
      min_players: payload.min_players || 3,
      max_players: payload.max_players || 4,
      open_category: categoryRule.open_category,
      min_category_tier: categoryRule.min_category_tier,
      max_category_tier: categoryRule.max_category_tier,
      competitive_season_id: activeSeason?.id || null,
      payment_required: true,
      state: MATCH_STATES.DRAFT,
    }, { transaction });

    await updateSlotLifecycle(slot, SLOT_STATES.HELD, { transaction });

    const quote = getPlayerPaymentQuote({
      totalCourtPrice: chargeableSlotPrice,
      maxPlayers: match.max_players,
      positionIndex: 0,
    });

    const payment = await MatchPayment.create({
      match_id: match.id,
      slot_id: slot.id,
      user_id: requester.id,
      role: MATCH_PAYMENT_ROLES.CREATOR,
      provider: MATCH_PAYMENT_CONFIG.provider,
      status: MATCH_PAYMENT_STATUSES.PENDING,
      position_index: 0,
      base_amount: quote.base_amount,
      extra_amount: quote.extra_amount,
      total_amount: quote.total_amount,
      currency: quote.currency,
      expires_at: addMinutes(new Date(), MATCH_PAYMENT_CONFIG.creator_intent_expires_minutes),
    }, { transaction });

    await payment.update({ external_reference: buildExternalReference(payment) }, { transaction });

    return payment;
  });

  try {
    return await attachCheckoutSession(payment.id);
  } catch (error) {
    await cancelPaymentIntent(payment.id, {
      reason: 'checkout_session_failed',
      failureReason: error.message,
    });
    throw error;
  }
}

async function createJoinPaymentIntent({ requester, matchId }) {
  const requesterUser = await User.findByPk(requester.id);
  if (!requesterUser) throw createPublicError('Usuario no encontrado', 404);

  const payment = await sequelize.transaction(async (transaction) => {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Slot, as: 'Slot' },
        { model: MatchPlayer, as: 'Players' },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!match) throw createPublicError('Partido no encontrado', 404);
    if (match.state !== MATCH_STATES.OPEN) throw createPublicError('El partido no esta disponible');
    if (!match.payment_required) throw createPublicError('Este partido aun usa el flujo sin pagos');

    if (!isUserAllowedByCategoryRule(match, resolveAuthoritativeTier(requester))) {
      throw createPublicError('Tu categoria no entra en el rango permitido para este partido');
    }

    const existingPlayer = await MatchPlayer.findOne({
      where: { match_id: match.id, user_id: requester.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existingPlayer) throw createPublicError('Ya estas en este partido');

    const existingPendingPayment = await MatchPayment.findOne({
      where: {
        match_id: match.id,
        user_id: requester.id,
        role: MATCH_PAYMENT_ROLES.PLAYER,
        status: {
          [Op.in]: [
            MATCH_PAYMENT_STATUSES.PENDING,
            MATCH_PAYMENT_STATUSES.APPROVED,
            MATCH_PAYMENT_STATUSES.REFUND_PENDING,
          ],
        },
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (existingPendingPayment) {
      throw createPublicError('Ya existe un intento de pago activo para este partido');
    }

    const playerCount = match.Players.length;
    if (playerCount >= match.max_players) throw createPublicError('El partido esta completo');
    if (!match.Slot) throw createPublicError('Turno no encontrado', 404);
    const chargeableSlotPrice = await ensureChargeableSlotPrice(match.Slot, transaction);

    const quote = getPlayerPaymentQuote({
      totalCourtPrice: chargeableSlotPrice,
      maxPlayers: match.max_players,
      positionIndex: playerCount,
    });

    const payment = await MatchPayment.create({
      match_id: match.id,
      slot_id: match.slot_id,
      user_id: requester.id,
      role: MATCH_PAYMENT_ROLES.PLAYER,
      provider: MATCH_PAYMENT_CONFIG.provider,
      status: MATCH_PAYMENT_STATUSES.PENDING,
      position_index: playerCount,
      base_amount: quote.base_amount,
      extra_amount: quote.extra_amount,
      total_amount: quote.total_amount,
      currency: quote.currency,
      expires_at: addMinutes(new Date(), MATCH_PAYMENT_CONFIG.join_intent_expires_minutes),
    }, { transaction });

    await payment.update({ external_reference: buildExternalReference(payment) }, { transaction });
    return payment;
  });

  try {
    return await attachCheckoutSession(payment.id);
  } catch (error) {
    await cancelPaymentIntent(payment.id, {
      reason: 'checkout_session_failed',
      failureReason: error.message,
    });
    throw error;
  }
}

async function approvePaymentIntent(paymentId, { providerPaymentId = null, providerPayload = null } = {}) {
  const result = await sequelize.transaction(async (transaction) => {
    const payment = await MatchPayment.findByPk(paymentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw createPublicError('Pago no encontrado', 404);

    if (payment.status === MATCH_PAYMENT_STATUSES.APPROVED) {
      return { payment, needsRefund: false };
    }

    if (isTerminalStatus(payment.status) && payment.status !== MATCH_PAYMENT_STATUSES.PENDING) {
      return { payment, needsRefund: false };
    }

    const match = await Match.findByPk(payment.match_id, {
      include: [
        { model: Slot, as: 'Slot' },
        { model: MatchPlayer, as: 'Players' },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!match) throw createPublicError('Partido no encontrado', 404);

    const slot = match.Slot;
    if (!slot) throw createPublicError('Turno no encontrado', 404);

    const playerCount = match.Players.length;

    if (payment.role === MATCH_PAYMENT_ROLES.CREATOR) {
      const existingCreator = await MatchPlayer.findOne({
        where: { match_id: match.id, user_id: payment.user_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!existingCreator) {
        await MatchPlayer.create({
          match_id: match.id,
          user_id: payment.user_id,
          team: getCanonicalSideForIndex(0, match.max_players),
        }, { transaction });
      }

      if (match.state === MATCH_STATES.DRAFT) {
        await updateMatchLifecycle(match, MATCH_STATES.OPEN, { transaction });
      }

      if ([SLOT_STATES.AVAILABLE, SLOT_STATES.RELEASED].includes(slot.state)) {
        await updateSlotLifecycle(slot, SLOT_STATES.HELD, { transaction });
      }
    } else {
      if (match.state !== MATCH_STATES.OPEN) {
        await payment.update({
          status: MATCH_PAYMENT_STATUSES.REFUND_PENDING,
          provider_payment_id: providerPaymentId || payment.provider_payment_id,
          provider_payload: providerPayload || payment.provider_payload,
          approved_at: payment.approved_at || new Date(),
          refund_reason: 'match_not_open',
        }, { transaction });

        return { payment, needsRefund: true };
      }

      const existingPlayer = await MatchPlayer.findOne({
        where: { match_id: match.id, user_id: payment.user_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingPlayer) {
        await payment.update({
          status: MATCH_PAYMENT_STATUSES.APPROVED,
          provider_payment_id: providerPaymentId || payment.provider_payment_id,
          provider_payload: providerPayload || payment.provider_payload,
          approved_at: payment.approved_at || new Date(),
        }, { transaction });

        return { payment, needsRefund: false };
      }

      if (playerCount >= match.max_players) {
        await payment.update({
          status: MATCH_PAYMENT_STATUSES.REFUND_PENDING,
          provider_payment_id: providerPaymentId || payment.provider_payment_id,
          provider_payload: providerPayload || payment.provider_payload,
          approved_at: payment.approved_at || new Date(),
          refund_reason: 'match_full',
        }, { transaction });

        return { payment, needsRefund: true };
      }

      await MatchPlayer.create({
        match_id: match.id,
        user_id: payment.user_id,
        team: getCanonicalSideForIndex(playerCount, match.max_players),
      }, { transaction });

      const newCount = playerCount + 1;
      if (newCount >= match.max_players) {
        await updateMatchLifecycle(match, MATCH_STATES.RESERVED, { transaction });
        await updateSlotLifecycle(slot, SLOT_STATES.RESERVED, { transaction });
        await payment.update({
          status: MATCH_PAYMENT_STATUSES.APPROVED,
          provider_payment_id: providerPaymentId || payment.provider_payment_id,
          provider_payload: providerPayload || payment.provider_payload,
          approved_at: payment.approved_at || new Date(),
          failure_reason: null,
        }, { transaction });

        return { payment, needsRefund: false, triggerReservationNotifications: true, matchId: match.id };
      } else if ([SLOT_STATES.AVAILABLE, SLOT_STATES.RELEASED].includes(slot.state)) {
        await updateSlotLifecycle(slot, SLOT_STATES.HELD, { transaction });
      }
    }

    await payment.update({
      status: MATCH_PAYMENT_STATUSES.APPROVED,
      provider_payment_id: providerPaymentId || payment.provider_payment_id,
      provider_payload: providerPayload || payment.provider_payload,
      approved_at: payment.approved_at || new Date(),
      failure_reason: null,
    }, { transaction });

    return { payment, needsRefund: false, triggerReservationNotifications: false, matchId: match.id };
  });

  if (result.needsRefund) {
    await refundPaymentIntent(result.payment.id, result.payment.refund_reason || 'automatic_refund');
  }

  if (result.triggerReservationNotifications) {
    triggerReservationNotifications(result.matchId).catch(console.error);
  }

  return loadPaymentAggregate(result.payment.id);
}

async function cancelPaymentIntent(paymentId, { reason = 'payment_cancelled', failureReason = null } = {}) {
  return sequelize.transaction(async (transaction) => {
    const payment = await MatchPayment.findByPk(paymentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw createPublicError('Pago no encontrado', 404);

    if (isTerminalStatus(payment.status)) {
      return payment;
    }

    await payment.update({
      status: MATCH_PAYMENT_STATUSES.CANCELLED,
      failure_reason: failureReason || reason,
    }, { transaction });

    if (payment.role === MATCH_PAYMENT_ROLES.CREATOR) {
      const match = await Match.findByPk(payment.match_id, { transaction, lock: transaction.LOCK.UPDATE });
      const slot = await Slot.findByPk(payment.slot_id, { transaction, lock: transaction.LOCK.UPDATE });

      if (match && match.state === MATCH_STATES.DRAFT) {
        await updateMatchLifecycle(match, MATCH_STATES.CANCELLED, { transaction });
      }

      if (slot && slot.state === SLOT_STATES.HELD) {
        await updateSlotLifecycle(slot, SLOT_STATES.AVAILABLE, { transaction });
      }
    }

    return payment;
  });
}

async function expirePaymentIntent(paymentId, reason = 'payment_intent_expired') {
  return sequelize.transaction(async (transaction) => {
    const payment = await MatchPayment.findByPk(paymentId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!payment) throw createPublicError('Pago no encontrado', 404);
    if (isTerminalStatus(payment.status)) return payment;

    await payment.update({
      status: MATCH_PAYMENT_STATUSES.EXPIRED,
      failure_reason: reason,
    }, { transaction });

    if (payment.role === MATCH_PAYMENT_ROLES.CREATOR) {
      const match = await Match.findByPk(payment.match_id, { transaction, lock: transaction.LOCK.UPDATE });
      const slot = await Slot.findByPk(payment.slot_id, { transaction, lock: transaction.LOCK.UPDATE });

      if (match && match.state === MATCH_STATES.DRAFT) {
        await updateMatchLifecycle(match, MATCH_STATES.CANCELLED, { transaction });
      }

      if (slot && slot.state === SLOT_STATES.HELD) {
        await updateSlotLifecycle(slot, SLOT_STATES.AVAILABLE, { transaction });
      }
    }

    return payment;
  });
}

async function refundPaymentIntent(paymentId, reason = 'match_payment_refund') {
  const payment = await MatchPayment.findByPk(paymentId);
  if (!payment) throw createPublicError('Pago no encontrado', 404);
  if (payment.status === MATCH_PAYMENT_STATUSES.REFUNDED) return payment;

  if (![
    MATCH_PAYMENT_STATUSES.APPROVED,
    MATCH_PAYMENT_STATUSES.REFUND_PENDING,
  ].includes(payment.status)) {
    return payment;
  }

  if (payment.status !== MATCH_PAYMENT_STATUSES.REFUND_PENDING) {
    await payment.update({
      status: MATCH_PAYMENT_STATUSES.REFUND_PENDING,
      refund_reason: reason,
    });
  }

  const refundPayload = await refundProviderPayment(payment);

  await payment.update({
    status: MATCH_PAYMENT_STATUSES.REFUNDED,
    refund_reason: reason,
    refunded_at: new Date(),
    provider_payload: refundPayload || payment.provider_payload,
  });

  return payment;
}

async function refundApprovedPaymentsForMatch(matchId, reason = 'match_cancelled') {
  const payments = await MatchPayment.findAll({
    where: {
      match_id: matchId,
      status: {
        [Op.in]: [MATCH_PAYMENT_STATUSES.APPROVED, MATCH_PAYMENT_STATUSES.REFUND_PENDING],
      },
    },
  });

  for (const payment of payments) {
    await refundPaymentIntent(payment.id, reason);
  }

  const pendingPayments = await MatchPayment.findAll({
    where: {
      match_id: matchId,
      status: MATCH_PAYMENT_STATUSES.PENDING,
    },
  });

  for (const payment of pendingPayments) {
    await cancelPaymentIntent(payment.id, {
      reason,
      failureReason: reason,
    });
  }
}

async function refundLatestApprovedPaymentForUser(matchId, userId, reason = 'user_left_match') {
  const payment = await MatchPayment.findOne({
    where: {
      match_id: matchId,
      user_id: userId,
      status: {
        [Op.in]: [MATCH_PAYMENT_STATUSES.APPROVED, MATCH_PAYMENT_STATUSES.REFUND_PENDING],
      },
    },
    order: [['approved_at', 'DESC'], ['createdAt', 'DESC']],
  });

  if (!payment) return null;
  return refundPaymentIntent(payment.id, reason);
}

async function findExpirablePendingPayments(referenceDate = new Date()) {
  return MatchPayment.findAll({
    where: {
      status: MATCH_PAYMENT_STATUSES.PENDING,
      expires_at: {
        [Op.lte]: referenceDate,
      },
    },
  });
}

async function findIncompletePaidMatches(referenceDate = new Date()) {
  const matches = await Match.findAll({
    where: {
      payment_required: true,
      state: {
        [Op.in]: [MATCH_STATES.OPEN, MATCH_STATES.RESERVED],
      },
    },
    include: [
      { model: Slot, as: 'Slot' },
      { model: MatchPlayer, as: 'Players' },
    ],
  });

  return matches.filter((match) => {
    if (!match.Slot) return false;
    if ((match.Players || []).length >= match.max_players) return false;
    return getIncompleteCancellationDeadline(match.Slot) <= referenceDate;
  });
}

async function cancelIncompletePaidMatch(matchId, reason = 'match_incomplete_deadline') {
  await sequelize.transaction(async (transaction) => {
    const match = await Match.findByPk(matchId, {
      include: [{ model: Slot, as: 'Slot' }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!match || !normalizeMatchStateForPendingAccess(match)) return;

    await updateMatchLifecycle(match, MATCH_STATES.CANCELLED, { transaction });

    if (match.Slot?.state === SLOT_STATES.HELD) {
      await updateSlotLifecycle(match.Slot, SLOT_STATES.AVAILABLE, { transaction });
    } else if (match.Slot?.state === SLOT_STATES.RESERVED) {
      await updateSlotLifecycle(match.Slot, SLOT_STATES.RELEASED, { transaction });
    }
  });

  await refundApprovedPaymentsForMatch(matchId, reason);
}

async function syncMercadoPagoPayment(providerPaymentId) {
  const remotePayment = await fetchProviderPayment(providerPaymentId);
  if (!remotePayment) throw createPublicError('No se pudo consultar el pago remoto', 400);

  const matchers = [{ provider_payment_id: String(providerPaymentId) }];
  if (remotePayment.external_reference) {
    matchers.push({ external_reference: remotePayment.external_reference });
  }

  const localPayment = await MatchPayment.findOne({
    where: {
      [Op.or]: matchers,
    },
  });

  if (!localPayment) {
    throw createPublicError('No se encontro el pago local para la notificacion', 404);
  }

  if (remotePayment.status === 'approved') {
    return approvePaymentIntent(localPayment.id, {
      providerPaymentId: String(providerPaymentId),
      providerPayload: remotePayment,
    });
  }

  if (['rejected', 'cancelled', 'canceled'].includes(remotePayment.status)) {
    await cancelPaymentIntent(localPayment.id, {
      reason: 'provider_rejected_payment',
      failureReason: remotePayment.status_detail || remotePayment.status,
    });
  }

  return loadPaymentAggregate(localPayment.id);
}

module.exports = {
  MATCH_PAYMENT_CONFIG,
  createPublicError,
  createCreatorPaymentIntent,
  createJoinPaymentIntent,
  approvePaymentIntent,
  cancelPaymentIntent,
  expirePaymentIntent,
  refundPaymentIntent,
  refundApprovedPaymentsForMatch,
  refundLatestApprovedPaymentForUser,
  findExpirablePendingPayments,
  findIncompletePaidMatches,
  cancelIncompletePaidMatch,
  syncMercadoPagoPayment,
  getIncompleteCancellationDeadline,
};
