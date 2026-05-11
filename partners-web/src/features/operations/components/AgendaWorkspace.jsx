import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { ENCLOSURE_LABELS, SURFACE_LABELS } from '../../dashboard/venueCatalog';
import {
  buildTimelineFromSlots,
  formatSlotRange,
  getSlotLayout,
} from '../lib/agendaBoard';

function getCourtMeta(court) {
  return [
    court.surface ? (SURFACE_LABELS[court.surface] || court.surface) : null,
    court.enclosure ? (ENCLOSURE_LABELS[court.enclosure] || court.enclosure) : null,
    court.type || null,
  ].filter(Boolean).join(' | ');
}

export default function AgendaWorkspace({
  courts,
  agenda,
  exceptions,
}) {
  const [selectedCourtId, setSelectedCourtId] = useState('all');

  const agendaByCourt = useMemo(() => courts.map((court) => {
    const allSlots = agenda.slots
      .filter((slot) => slot.date === agenda.selectedAgendaDate && slot.Court?.id === court.id)
      .sort((a, b) => a.time.localeCompare(b.time));
    const visibleSlots = allSlots.filter((slot) => (agenda.agendaFilter === 'all'
      ? true
      : agenda.agendaFilter === 'free'
        ? agenda.isOperationallyAvailable(slot)
        : !agenda.isOperationallyAvailable(slot)));
    const activeClosure = (exceptions.closuresByCourt[court.id] || [])
      .find((closure) => closure.start_date <= agenda.selectedAgendaDate && closure.end_date >= agenda.selectedAgendaDate) || null;

    return {
      ...court,
      allSlots,
      slots: visibleSlots,
      freeCount: allSlots.filter((slot) => agenda.isOperationallyAvailable(slot)).length,
      occupiedCount: allSlots.filter((slot) => !agenda.isOperationallyAvailable(slot)).length,
      activeClosure,
    };
  }), [agenda, courts, exceptions.closuresByCourt]);

  const effectiveSelectedCourtId = selectedCourtId === 'all' || courts.some((court) => String(court.id) === String(selectedCourtId))
    ? selectedCourtId
    : 'all';
  const selectedDayOverride = exceptions.exceptionMap[agenda.selectedAgendaDate] || null;
  const visibleCourts = effectiveSelectedCourtId === 'all'
    ? agendaByCourt
    : agendaByCourt.filter((court) => String(court.id) === String(effectiveSelectedCourtId));
  const activeClosuresToday = agendaByCourt.filter((court) => court.activeClosure).length;
  const boardTimeline = useMemo(
    () => buildTimelineFromSlots(visibleCourts.flatMap((court) => court.allSlots)),
    [visibleCourts],
  );
  const boardGridStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${boardTimeline.totalSteps}, minmax(0, 1fr))`,
      '--agenda-total-steps': boardTimeline.totalSteps,
    }),
    [boardTimeline.totalSteps],
  );

  return (
    <div className="stack">
      <section className="agendaShell">
        <div className="agendaMain glass">
          <div className="agendaHeader">
            <div>
              <p className="eyebrow">Agenda diaria</p>
              <h3>{agenda.selectedAgendaDate ? agenda.formatDateLabel(agenda.selectedAgendaDate, true) : 'Sin agenda cargada'}</h3>
              <p className="subtle">
                {agenda.isSelectedDateHydrating
                  ? 'Actualizando disponibilidad del dia...'
                  : `${agenda.selectedDaySummary.total} t / ${agenda.selectedDaySummary.free} disp / ${agenda.selectedDaySummary.occupied} comp`}
              </p>
            </div>

            <div className="agendaHeaderRight">
              <div className="todayBadges">
                <span className="miniBadge neutral" aria-label={`${agenda.summary.totalToday} turnos hoy`}>{agenda.summary.totalToday} hoy</span>
                <span className="miniBadge free" aria-label={`${agenda.summary.freeToday} disponibles`}>{agenda.summary.freeToday} disp</span>
                <span className="miniBadge busy" aria-label={`${agenda.summary.occupiedToday} comprometidos`}>{agenda.summary.occupiedToday} comp</span>
              </div>

              <div className="agendaActions">
                <button className="btn-secondary compact" onClick={agenda.refreshAgenda} disabled={agenda.isLoadingSlots}>
                  {agenda.isLoadingSlots ? 'Actualizando...' : 'Actualizar'}
                </button>
                <button className="btn-primary-sm compact" onClick={() => agenda.setShowAvailabilityBuilder(true)}>
                  <Plus size={16} />
                  Configurar
                </button>
              </div>
            </div>
          </div>

          <div className={`dayNavigator ${agenda.isTodaySelected ? 'today' : 'otherDay'}`}>
            <div className="dayNavigatorMain">
              <div className="dayStepper">
                <button
                  type="button"
                  className="navDayBtn"
                  aria-label="Dia anterior"
                  onClick={() => agenda.setSelectedAgendaDate((prev) => agenda.shiftDateStr(prev || agenda.todayStr(), -1))}
                >
                  Ant.
                </button>
                <div className="currentDayBlock">
                  <span>{agenda.isTodaySelected ? 'Hoy' : 'Fecha'}</span>
                  <strong>{agenda.selectedAgendaDate ? agenda.formatDateLabel(agenda.selectedAgendaDate, true) : 'Selecciona una fecha'}</strong>
                </div>
                <button
                  type="button"
                  className="navDayBtn"
                  aria-label="Dia siguiente"
                  onClick={() => agenda.setSelectedAgendaDate((prev) => agenda.shiftDateStr(prev || agenda.todayStr(), 1))}
                >
                  Sig.
                </button>
              </div>
            </div>

            <div className="dayNavigatorMeta">
              <button type="button" className="btn-outline compact" onClick={() => exceptions.openDayOverride(agenda.selectedDaySlots)}>
                Disponibilidad del dia
              </button>
              <button type="button" className={`todayShortcut ${agenda.isTodaySelected ? 'active' : ''}`} onClick={() => agenda.setSelectedAgendaDate(agenda.todayStr())}>
                Ir a hoy
              </button>
              <label>
                <span>Fecha</span>
                <input
                  type="date"
                  value={agenda.selectedAgendaDate}
                  onChange={(e) => {
                    agenda.setSelectedAgendaDate(e.target.value);
                    exceptions.setSelectedDate(e.target.value);
                  }}
                />
              </label>
            </div>
          </div>

          <div className="agendaToolbar stickyAgendaToolbar">
            <div className="toolbarGroup">
              <div className="segmented" role="group" aria-label="Filtrar turnos por estado">
                <button className={agenda.agendaFilter === 'all' ? 'active' : ''} onClick={() => agenda.setAgendaFilter('all')} aria-pressed={agenda.agendaFilter === 'all'}>Todos</button>
                <button className={agenda.agendaFilter === 'free' ? 'active' : ''} onClick={() => agenda.setAgendaFilter('free')} aria-pressed={agenda.agendaFilter === 'free'}>Disponibles</button>
                <button className={agenda.agendaFilter === 'occupied' ? 'active' : ''} onClick={() => agenda.setAgendaFilter('occupied')} aria-pressed={agenda.agendaFilter === 'occupied'}>Comprometidos</button>
              </div>
              {selectedDayOverride ? <span className="miniBadge dayOverride" role="status">Dia ajustado</span> : null}
              {activeClosuresToday ? <span className="miniBadge closed" role="status">{activeClosuresToday} cierres</span> : null}
            </div>
            <div className="toolbarGroup">
              <div className="courtFilterChips" role="tablist" aria-label="Filtrar agenda por cancha">
                <button type="button" role="tab" aria-selected={effectiveSelectedCourtId === 'all'} className={effectiveSelectedCourtId === 'all' ? 'active' : ''} onClick={() => setSelectedCourtId('all')}>Todas</button>
                {agendaByCourt.map((court) => (
                  <button
                    key={court.id}
                    type="button"
                    role="tab"
                    aria-selected={String(effectiveSelectedCourtId) === String(court.id)}
                    className={String(effectiveSelectedCourtId) === String(court.id) ? 'active' : ''}
                    onClick={() => setSelectedCourtId(String(court.id))}
                  >
                    {court.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!agenda.selectedDaySummary.total && !agenda.isSelectedDateHydrating ? (
            <div className="agendaEmptyGuidance">
              <div>
                <p className="eyebrow">Dia sin agenda</p>
                <strong>{agenda.selectedAgendaDate ? agenda.formatDateLabel(agenda.selectedAgendaDate, true) : 'La fecha seleccionada'} no tiene turnos visibles</strong>
                <p className="subtle">Puede faltar generacion de disponibilidad, haber un override vacio o una clausura que cerro el inventario del dia.</p>
              </div>
              <div className="actions">
                <button className="btn-primary-sm" onClick={() => agenda.setShowAvailabilityBuilder(true)}>
                  <Plus size={16} />
                  Generar disponibilidad
                </button>
                <button className="btn-outline compact" onClick={() => exceptions.openDayOverride(agenda.selectedDaySlots)}>Ajustar dia</button>
              </div>
            </div>
          ) : null}

          <div className="agendaBoardUtilityBar">
            <div className="agendaBoardLegend" aria-label="Estados de la agenda">
              <span className="agendaLegendItem"><span className="agendaLegendSwatch free" />Libre</span>
              <span className="agendaLegendItem"><span className="agendaLegendSwatch busy" />Comprometido</span>
            </div>
          </div>

          <div className="agendaBoardViewport">
            <div className="agendaBoard">
              <div className="agendaBoardHeader">
                <div className="agendaBoardCorner">
                  <span className="eyebrow">Canchas</span>
                  <strong>{visibleCourts.length}</strong>
                  <small>visibles / 90 min</small>
                </div>
                <div className="agendaBoardHours" style={boardGridStyle}>
                  {boardTimeline.hourMarkers.map((marker) => (
                    <div
                      key={`${marker.label}-${marker.columnStart}`}
                      className="agendaBoardHour"
                      style={{ gridColumn: `${marker.columnStart} / span ${marker.spanSteps}` }}
                    >
                      <span>{marker.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="agendaBoardRows">
                {agenda.isSelectedDateHydrating ? (
                  <div className="emptyLane">
                    <span>Actualizando disponibilidad para {agenda.selectedAgendaDate ? agenda.formatDateLabel(agenda.selectedAgendaDate, true) : 'el dia seleccionado'}...</span>
                  </div>
                ) : visibleCourts.map((court) => {
                  const courtMeta = getCourtMeta(court);

                  return (
                    <section key={court.id} className={`agendaBoardRow${court.activeClosure ? ' has-closure' : ''}`}>
                      <div className="agendaBoardCourt">
                        <div>
                          <strong>{court.name}</strong>
                          <p>{courtMeta || 'Sin metadatos cargados'}</p>
                        </div>
                        <div className="agendaBoardCourtBadges">
                          <span className="miniBadge neutral" title={`${court.allSlots.length} turnos`}>{court.allSlots.length} t</span>
                          <span className="miniBadge free" title={`${court.freeCount} disponibles`}>{court.freeCount} disp</span>
                          <span className="miniBadge busy" title={`${court.occupiedCount} comprometidos`}>{court.occupiedCount} comp</span>
                          {court.activeClosure ? <span className="miniBadge closed">cierre</span> : null}
                        </div>
                      </div>

                      <div className="agendaBoardLane" style={boardGridStyle}>
                        {court.allSlots.length === 0 ? (
                          <div className="agendaLaneEmpty" style={{ gridColumn: '1 / -1', gridRow: 1 }}>
                            <span>{court.activeClosure ? 'Cancha clausurada para este dia.' : 'Sin agenda generada para este dia.'}</span>
                          </div>
                        ) : court.slots.length === 0 ? (
                          <div className="agendaLaneEmpty" style={{ gridColumn: '1 / -1', gridRow: 1 }}>
                            <span>No hay bloques para el filtro actual.</span>
                          </div>
                        ) : court.slots.map((slot) => {
                          const status = agenda.getSlotStatus(slot);
                          const layout = getSlotLayout(slot, boardTimeline);
                          const isAvailable = agenda.isOperationallyAvailable(slot);
                          const isReleasableManualBooking = agenda.canReleaseManualBooking(slot);
                          const isInteractive = isAvailable || isReleasableManualBooking;

                          if (!layout) return null;

                          const blockProps = {
                            key: slot.id,
                            className: `agendaSlotBlock ${isAvailable ? 'free' : 'busy'}${isReleasableManualBooking ? ' releasable' : ''}`,
                            style: { gridColumn: `${layout.columnStart} / span ${layout.columnSpan}`, gridRow: 1 },
                            title: `${slot.Court?.name || court.name} | ${formatSlotRange(slot)} | ${isAvailable ? 'Libre' : status.detail}`,
                          };

                          if (isInteractive) {
                            return (
                              <button
                                type="button"
                                {...blockProps}
                                onClick={() => (isAvailable ? agenda.openBooking(slot) : agenda.handleReleaseSlot(slot))}
                                aria-label={`${isAvailable ? 'Reservar' : 'Liberar'} ${slot.Court?.name || court.name} de ${formatSlotRange(slot)}`}
                              >
                                <span className="agendaSlotTime">{formatSlotRange(slot)}</span>
                                <small>{isAvailable ? 'Click para reservar' : 'Reserva manual | click para liberar'}</small>
                              </button>
                            );
                          }

                          return (
                            <div {...blockProps}>
                              <span className="agendaSlotTime">{formatSlotRange(slot)}</span>
                              <small>{status.detail}</small>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
