import React, { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PartnerOperationsLayout from '../PartnerOperationsLayout';
import { useAgendaData } from '../hooks/useAgendaData';
import { useExceptionsData } from '../hooks/useExceptionsData';
import { useOperationsVenue } from '../hooks/useOperationsVenue';

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

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      venueState.refreshVenue(),
      agenda.fetchSlots(),
      exceptions.refreshExceptions(),
    ]);
  }, [agenda, exceptions, venueState]);

  const todayCourtSummary = useMemo(() => venueState.courts.map((court) => {
    const daySlots = agenda.selectedDaySlots.filter((slot) => slot.Court?.id === court.id);
    const activeClosure = (exceptions.closuresByCourt[court.id] || []).find((closure) => (
      closure.start_date <= agenda.todayStr() && closure.end_date >= agenda.todayStr()
    )) || null;

    return {
      id: court.id,
      name: court.name,
      free: daySlots.filter((slot) => agenda.isOperationallyAvailable(slot)).length,
      busy: daySlots.filter((slot) => !agenda.isOperationallyAvailable(slot)).length,
      total: daySlots.length,
      activeClosure,
    };
  }), [agenda, exceptions.closuresByCourt, venueState.courts]);

  const todayCommittedSlots = useMemo(() => agenda.selectedDaySlots
    .filter((slot) => !agenda.isOperationallyAvailable(slot))
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
    .slice(0, 5), [agenda]);

  const nextActionLabel = agenda.summary.nextAvailable
    ? `${agenda.summary.nextAvailable.Court?.name || 'Cancha'} · ${agenda.summary.nextAvailable.time}`
    : 'No quedan huecos libres hoy';

  return (
    <PartnerOperationsLayout
      venue={venueState.venue}
      sectionLabel="Hoy"
      title="Lectura operativa del día"
      description="Priorizá incidentes, capacidad y próxima acción desde un home operativo pensado para recepción y gestión rápida del día."
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={agenda.slotsError || exceptions.exceptionsError || venueState.venueError}
      actions={(
        <div className="operationsQuickLinks">
          <Link className="btn-primary-sm" to="/operations/agenda">Abrir agenda</Link>
          <Link className="btn-outline compact" to="/operations/excepciones">Gestionar incidentes</Link>
        </div>
      )}
    >
      <div className="stack">
        <section className="stats">
          <article className="stat glass"><span>Disponibles hoy</span><strong>{agenda.summary.freeToday}</strong><small>Capacidad operativa abierta</small></article>
          <article className="stat glass"><span>Comprometidos hoy</span><strong>{agenda.summary.occupiedToday}</strong><small>Reservas, bloqueos y cierres del día</small></article>
          <article className="stat glass"><span>Canchas con agenda</span><strong>{agenda.summary.configuredCourts}/{venueState.courts.length}</strong><small>{agenda.summary.unconfiguredCourts ? `${agenda.summary.unconfiguredCourts} sin configurar` : 'Todas activas'}</small></article>
          <article className="stat glass accent"><span>Próximo libre</span><strong>{agenda.summary.nextAvailable ? agenda.summary.nextAvailable.time : '--:--'}</strong><small>{agenda.summary.nextAvailable ? `${agenda.summary.nextAvailable.Court?.name} · ${agenda.formatDateLabel(agenda.summary.nextAvailable.date)}` : 'Sin turnos disponibles'}</small></article>
        </section>

        <section className="operationsGrid operationsGridWide">
          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Atención inmediata</p>
                <h3>{exceptions.urgentClosures.length ? `${exceptions.urgentClosures.length} incidentes activos` : 'Día estable'}</h3>
                <p className="subtle">Mostramos primero lo que impacta la operación de hoy para que no tengas que abrir cada módulo.</p>
              </div>
              <span className="miniBadge busy">{agenda.selectedDaySummary.occupied} comprometidos</span>
            </div>

            <div className="priorityList">
              {exceptions.urgentClosures.length ? exceptions.urgentClosures.map((closure) => (
                <div key={closure.id} className="priorityCard urgent">
                  <div>
                    <strong>{closure.courtName}</strong>
                    <p className="subtle">{closure.affectedRange}</p>
                    <small>{closure.reason || 'Sin motivo cargado.'}</small>
                  </div>
                  <Link className="btn-outline compact" to="/operations/excepciones">Resolver</Link>
                </div>
              )) : (
                <div className="priorityCard calm">
                  <div>
                    <strong>Sin clausuras urgentes</strong>
                    <p className="subtle">La operación no tiene cierres activos para hoy.</p>
                  </div>
                </div>
              )}

              {todayCommittedSlots.length ? todayCommittedSlots.map((slot) => {
                const status = agenda.getSlotStatus(slot);
                return (
                  <div key={slot.id} className="priorityCard neutral">
                    <div>
                      <strong>{slot.Court?.name || 'Cancha'} · {slot.time}</strong>
                      <p className="subtle">{status.label} · {status.detail}</p>
                      <small>{slot.occupant_name || slot.occupant_phone || 'Turno comprometido'}</small>
                    </div>
                    <Link className="btn-outline compact" to="/operations/agenda">Ver agenda</Link>
                  </div>
                );
              }) : null}
            </div>
          </article>

          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Próxima jugada</p>
                <h3>{nextActionLabel}</h3>
                <p className="subtle">Saltá directo al flujo correcto según si necesitás ocupar, bloquear o revisar infraestructura.</p>
              </div>
            </div>

            <div className="quickActionGrid">
              <Link className="quickActionCard" to="/operations/agenda">
                <span className="miniBadge free">Agenda</span>
                <strong>Tomar o bloquear un turno</strong>
                <p className="subtle">Entrá con la fecha de hoy y seguí con ocupación manual o ajuste diario.</p>
              </Link>
              <Link className="quickActionCard" to="/operations/excepciones">
                <span className="miniBadge dayOverride">Excepciones</span>
                <strong>Resolver cierres y overrides</strong>
                <p className="subtle">Separá incidentes temporales de la planificación semanal.</p>
              </Link>
              <Link className="quickActionCard" to="/operations/canchas">
                <span className="miniBadge neutral">Canchas</span>
                <strong>Ajustar inventario operativo</strong>
                <p className="subtle">Editá roster, metadata y visibilidad de clausuras.</p>
              </Link>
              <Link className="quickActionCard" to="/operations/sede">
                <span className="miniBadge neutral">Sede</span>
                <strong>Actualizar datos comerciales</strong>
                <p className="subtle">Nombre, contacto, servicios y precio general viven acá.</p>
              </Link>
            </div>
          </article>
        </section>

        <section className="operationsGrid">
          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Mapa por cancha</p>
                <h3>{todayCourtSummary.length} frentes operativos</h3>
                <p className="subtle">Lectura rápida de carga, cierres y capacidad por cancha para distribuir prioridades.</p>
              </div>
            </div>
            <div className="compactGrid">
              {todayCourtSummary.map((court) => (
                <article key={court.id} className="listCard miniSurfaceCard">
                  <div className="listCardRow">
                    <div>
                      <strong>{court.name}</strong>
                      <p className="subtle">{court.total ? `${court.free} libres · ${court.busy} comprometidos` : 'Sin agenda generada hoy'}</p>
                    </div>
                    {court.activeClosure ? <span className="miniBadge closed">Clausurada</span> : <span className="miniBadge free">Operativa</span>}
                  </div>
                  <small>{court.activeClosure ? court.activeClosure.reason || 'Clausura sin motivo cargado.' : 'Lista para operar en agenda.'}</small>
                </article>
              ))}
            </div>
          </article>

          <article className="operationsPanel glass">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Pendientes de configuración</p>
                <h3>{agenda.summary.unconfiguredCourts}</h3>
                <p className="subtle">Si una cancha no tiene agenda cargada, se vuelve un problema de inventario antes que de venta.</p>
              </div>
              <Link className="btn-outline compact" to="/operations/canchas">Revisar canchas</Link>
            </div>
            <div className="emptyState large">
              <div>
                <strong>{agenda.summary.unconfiguredCourts ? 'Hay capacidad sin publicar.' : 'Toda la infraestructura está conectada.'}</strong>
                <p className="subtle">Usá Canchas para ajustar el roster y Agenda para regenerar disponibilidad cuando cambie el inventario.</p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </PartnerOperationsLayout>
  );
}
