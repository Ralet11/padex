import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PartnerOperationsLayout from '../PartnerOperationsLayout';
import { useAgendaData } from '../hooks/useAgendaData';
import { useExceptionsData } from '../hooks/useExceptionsData';
import { useOperationsVenue } from '../hooks/useOperationsVenue';
import { SLOT_STATE, isManualPartnerReservation } from '../lib/slotStatus';

const CURRENCY_FORMATTER = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function toAmount(value) {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
}

function resolveSlotPrice(slot, venuePrice) {
  const slotPrice = toAmount(slot?.price);
  if (slotPrice > 0) return slotPrice;

  const baseVenuePrice = toAmount(venuePrice);
  return baseVenuePrice > 0 ? baseVenuePrice : 0;
}

function isHeldSlot(slot) {
  return !isManualPartnerReservation(slot) && slot?.state === SLOT_STATE.HELD;
}

function isRevenueSlot(slot, isOperationallyAvailable) {
  if (isOperationallyAvailable(slot)) return false;
  if (isHeldSlot(slot)) return false;
  return true;
}

function isPadexRevenueSlot(slot) {
  if (isManualPartnerReservation(slot)) return false;
  return [
    SLOT_STATE.RESERVED,
    SLOT_STATE.OCCUPIED,
    SLOT_STATE.COMPLETED,
  ].includes(slot?.state);
}

function compareSlots(a, b) {
  return `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`);
}

export default function HoyPage(props) {
  const { venue, onLogout, onRefresh, error } = props;
  const venueState = useOperationsVenue({ venue, error, onRefresh });
  const agenda = useAgendaData({ venueId: venueState.venue?.id, courts: venueState.courts, includeRules: false });
  const exceptions = useExceptionsData({
    venueId: venueState.venue?.id,
    courts: venueState.courts,
    viewRange: agenda.viewRange,
    planningTo: agenda.viewRange.to,
  });
  const { slots, summary: agendaSummary, isOperationallyAvailable, todayStr: getTodayStr } = agenda;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      venueState.refreshVenue(),
      agenda.fetchSlots(),
      exceptions.refreshExceptions(),
    ]);
  }, [agenda, exceptions, venueState]);

  const today = getTodayStr();
  const todaySlots = useMemo(
    () => slots.filter((slot) => slot.date === today).sort(compareSlots),
    [slots, today],
  );

  const slotPriceBase = toAmount(venueState.venue?.price_per_slot);

  const revenueSlotsToday = useMemo(
    () => todaySlots.filter((slot) => isRevenueSlot(slot, isOperationallyAvailable)),
    [isOperationallyAvailable, todaySlots],
  );

  const manualRevenueSlotsToday = useMemo(
    () => revenueSlotsToday.filter((slot) => isManualPartnerReservation(slot)),
    [revenueSlotsToday],
  );

  const padexRevenueSlotsToday = useMemo(
    () => revenueSlotsToday.filter((slot) => isPadexRevenueSlot(slot)),
    [revenueSlotsToday],
  );

  const heldSlotsToday = useMemo(
    () => todaySlots.filter((slot) => isHeldSlot(slot)),
    [todaySlots],
  );

  const estimatedRevenueToday = useMemo(
    () => revenueSlotsToday.reduce((total, slot) => total + resolveSlotPrice(slot, slotPriceBase), 0),
    [revenueSlotsToday, slotPriceBase],
  );

  const freeTodayCount = useMemo(
    () => todaySlots.filter((slot) => isOperationallyAvailable(slot)).length,
    [isOperationallyAvailable, todaySlots],
  );

  const nextAvailableToday = useMemo(
    () => todaySlots.find((slot) => isOperationallyAvailable(slot)) || null,
    [isOperationallyAvailable, todaySlots],
  );

  const todayCourtSummary = useMemo(() => venueState.courts.map((court) => {
    const courtSlots = todaySlots.filter((slot) => slot.Court?.id === court.id);
    const courtRevenueSlots = courtSlots.filter((slot) => isRevenueSlot(slot, isOperationallyAvailable));
    const courtHeldSlots = courtSlots.filter((slot) => isHeldSlot(slot));
    const activeClosure = (exceptions.closuresByCourt[court.id] || []).find((closure) => (
      closure.start_date <= today && closure.end_date >= today
    )) || null;

    return {
      id: court.id,
      name: court.name,
      free: courtSlots.filter((slot) => isOperationallyAvailable(slot)).length,
      reserved: courtRevenueSlots.length,
      held: courtHeldSlots.length,
      estimatedRevenue: courtRevenueSlots.reduce(
        (total, slot) => total + resolveSlotPrice(slot, slotPriceBase),
        0,
      ),
      activeClosure,
    };
  }), [exceptions.closuresByCourt, isOperationallyAvailable, slotPriceBase, today, todaySlots, venueState.courts]);

  const upcomingSlotsToday = useMemo(
    () => [...revenueSlotsToday, ...heldSlotsToday].sort(compareSlots).slice(0, 6),
    [heldSlotsToday, revenueSlotsToday],
  );

  const alertItems = useMemo(() => {
    const items = [];

    if (exceptions.urgentClosures.length) {
      items.push({
        key: 'closures',
        label: `${exceptions.urgentClosures.length} clausura${exceptions.urgentClosures.length > 1 ? 's' : ''} activa${exceptions.urgentClosures.length > 1 ? 's' : ''}`,
        detail: 'Hay canchas afectadas hoy.',
        to: '/operations/excepciones',
        action: 'Resolver',
      });
    }

    if (heldSlotsToday.length) {
      items.push({
        key: 'held',
        label: `${heldSlotsToday.length} turno${heldSlotsToday.length > 1 ? 's' : ''} en confirmacion`,
        detail: 'Hay pagos o reservas aun sin cerrar.',
        to: '/operations/agenda',
        action: 'Ver agenda',
      });
    }

    if (agendaSummary.unconfiguredCourts) {
      items.push({
        key: 'courts',
        label: `${agendaSummary.unconfiguredCourts} cancha${agendaSummary.unconfiguredCourts > 1 ? 's' : ''} sin agenda`,
        detail: 'Hay capacidad que todavia no se publico.',
        to: '/operations/canchas',
        action: 'Revisar',
      });
    }

    return items;
  }, [agendaSummary.unconfiguredCourts, exceptions.urgentClosures.length, heldSlotsToday.length]);

  return (
    <PartnerOperationsLayout
      venue={venueState.venue}
      sectionLabel="Hoy"
      title="Lectura operativa del dia"
      description="Una vista rapida del dia con facturacion estimada, reservas, alertas y estado de cada cancha."
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={agenda.slotsError || exceptions.exceptionsError || venueState.venueError}
      actions={(
        <div className="operationsQuickLinks">
          <Link className="btn-primary-sm" to="/operations/agenda">Abrir agenda</Link>
          <Link className="btn-outline compact" to="/operations/excepciones">Ver alertas</Link>
        </div>
      )}
    >
      <div className="stack">
        <section className="stats">
          <article className="stat glass accent">
            <span>Caja estimada hoy</span>
            <strong>{CURRENCY_FORMATTER.format(estimatedRevenueToday)}</strong>
            <small>Solo considera turnos ya reservados.</small>
          </article>
          <article className="stat glass">
            <span>Turnos reservados</span>
            <strong>{revenueSlotsToday.length}</strong>
            <small>No incluye pagos en confirmacion.</small>
          </article>
          <article className="stat glass">
            <span>Reservas manuales</span>
            <strong>{manualRevenueSlotsToday.length}</strong>
            <small>Cargadas desde agenda.</small>
          </article>
          <article className="stat glass">
            <span>Reservas Padex</span>
            <strong>{padexRevenueSlotsToday.length}</strong>
            <small>Tomadas por la app.</small>
          </article>
          <article className="stat glass">
            <span>Libres restantes</span>
            <strong>{freeTodayCount}</strong>
            <small>{nextAvailableToday ? `Proximo libre: ${nextAvailableToday.time}` : 'No quedan huecos libres hoy.'}</small>
          </article>
          <article className="stat glass">
            <span>Alertas activas</span>
            <strong>{alertItems.length}</strong>
            <small>{alertItems.length ? 'Revisar antes de seguir vendiendo.' : 'Sin bloqueos operativos.'}</small>
          </article>
        </section>

        <section className="operationsGrid operationsGridWide">
          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Reservas del dia</p>
                <h3>{upcomingSlotsToday.length ? 'Lo que ya esta comprometido hoy' : 'Todavia no hay reservas confirmadas'}</h3>
                <p className="subtle">Lectura rapida de turnos manuales, reservas Padex y pagos que siguen en confirmacion.</p>
              </div>
              <Link className="btn-outline compact" to="/operations/agenda">Ir a agenda</Link>
            </div>

            <div className="priorityList">
              {upcomingSlotsToday.length ? upcomingSlotsToday.map((slot) => {
                const isManual = isManualPartnerReservation(slot);
                const isHeld = isHeldSlot(slot);
                const priceLabel = resolveSlotPrice(slot, slotPriceBase) > 0
                  ? CURRENCY_FORMATTER.format(resolveSlotPrice(slot, slotPriceBase))
                  : 'Sin precio';

                return (
                  <div key={slot.id} className="priorityCard neutral">
                    <div>
                      <strong>{slot.Court?.name || 'Cancha'} - {slot.time}</strong>
                      <p className="subtle">
                        {isHeld ? 'Pendiente de confirmacion' : isManual ? 'Reserva manual' : 'Reserva Padex'}
                        {' - '}
                        {priceLabel}
                      </p>
                      <small>{slot.occupant_name || slot.occupant_phone || 'Partido tomado desde la app'}</small>
                    </div>
                    <span className={`miniBadge ${isHeld ? 'busy' : isManual ? 'neutral' : 'free'}`}>
                      {isHeld ? 'Pendiente' : isManual ? 'Manual' : 'Padex'}
                    </span>
                  </div>
                );
              }) : (
                <div className="priorityCard calm">
                  <div>
                    <strong>Dia todavia abierto</strong>
                    <p className="subtle">No hay turnos reservados en la lectura actual.</p>
                  </div>
                </div>
              )}
            </div>
          </article>

          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Alertas operativas</p>
                <h3>{alertItems.length ? 'Puntos para mirar hoy' : 'Operacion estable'}</h3>
                <p className="subtle">Solo dejamos lo que puede afectar venta, servicio o disponibilidad del dia.</p>
              </div>
            </div>

            <div className="priorityList">
              {alertItems.length ? alertItems.map((item) => (
                <div key={item.key} className="priorityCard urgent">
                  <div>
                    <strong>{item.label}</strong>
                    <p className="subtle">{item.detail}</p>
                  </div>
                  <Link className="btn-outline compact" to={item.to}>{item.action}</Link>
                </div>
              )) : (
                <div className="priorityCard calm">
                  <div>
                    <strong>Sin alertas activas</strong>
                    <p className="subtle">No hay cierres urgentes, pagos pendientes ni canchas sin agenda.</p>
                  </div>
                </div>
              )}
            </div>
          </article>
        </section>

        <section className="operationsGrid">
          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Estado por cancha</p>
                <h3>{todayCourtSummary.length} cancha{todayCourtSummary.length === 1 ? '' : 's'} en lectura</h3>
                <p className="subtle">Cuanto vendio cada frente hoy, cuanto queda libre y si hay impacto operativo.</p>
              </div>
            </div>

            <div className="compactGrid">
              {todayCourtSummary.map((court) => (
                <article key={court.id} className="listCard miniSurfaceCard">
                  <div className="listCardRow">
                    <div>
                      <strong>{court.name}</strong>
                      <p className="subtle">
                        {court.reserved} reservados - {court.free} libres
                        {court.held ? ` - ${court.held} pendientes` : ''}
                      </p>
                    </div>
                    {court.activeClosure ? <span className="miniBadge closed">Clausurada</span> : <span className="miniBadge free">Operativa</span>}
                  </div>
                  <small>
                    {court.activeClosure
                      ? court.activeClosure.reason || 'Clausura activa sin motivo cargado.'
                      : `${CURRENCY_FORMATTER.format(court.estimatedRevenue)} estimados hoy.`}
                  </small>
                </article>
              ))}
            </div>
          </article>

          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Corte rapido</p>
                <h3>{todaySlots.length ? 'Lectura comercial del dia' : 'Sin agenda generada hoy'}</h3>
                <p className="subtle">Una sintesis corta para saber si hoy estas vendiendo bien o si falta abrir capacidad.</p>
              </div>
            </div>

            <div className="emptyState large">
              <div>
                <strong>
                  {todaySlots.length
                    ? `${revenueSlotsToday.length} de ${todaySlots.length} turnos ya estan comprometidos.`
                    : 'Todavia no hay turnos cargados para hoy.'}
                </strong>
                <p className="subtle">
                  {todaySlots.length
                    ? `Tenes ${manualRevenueSlotsToday.length} manuales, ${padexRevenueSlotsToday.length} por Padex y ${freeTodayCount} huecos todavia vendibles.`
                    : 'Revisa Agenda o Canchas para generar disponibilidad y empezar a operar el dia.'}
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </PartnerOperationsLayout>
  );
}
