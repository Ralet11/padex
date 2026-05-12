import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { shiftDateStr, todayStr } from '../lib/dates';

export default function ExceptionsWorkspace({
  courts,
  exceptions,
  formatDateLabel,
  onOpenDayOverride,
  onOpenClosure,
  onSelectedDateChange,
}) {
  const isTodaySelected = exceptions.selectedDate === todayStr();

  return (
    <div className="stack">
      <section className={`dayNavigator ${isTodaySelected ? 'today' : 'otherDay'}`}>
        <div className="dayNavigatorMain">
          <div className="dayStepper">
            <button
              type="button"
              className="navDayBtn"
              aria-label="Dia anterior"
              onClick={() => onSelectedDateChange(shiftDateStr(exceptions.selectedDate || todayStr(), -1))}
            >
              Ant.
            </button>
            <div className="currentDayBlock">
              <span>{isTodaySelected ? 'Hoy' : 'Fecha'}</span>
              <strong>{exceptions.selectedDate ? formatDateLabel(exceptions.selectedDate, true) : 'Selecciona una fecha'}</strong>
            </div>
            <button
              type="button"
              className="navDayBtn"
              aria-label="Dia siguiente"
              onClick={() => onSelectedDateChange(shiftDateStr(exceptions.selectedDate || todayStr(), 1))}
            >
              Sig.
            </button>
          </div>
        </div>

        <div className="dayNavigatorMeta">
          <button type="button" className="btn-primary-sm" onClick={onOpenDayOverride}>
            Editar dia
          </button>
          <button type="button" className={`todayShortcut ${isTodaySelected ? 'active' : ''}`} onClick={() => onSelectedDateChange(todayStr())}>
            Ir a hoy
          </button>
          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={exceptions.selectedDate}
              onChange={(event) => onSelectedDateChange(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="stats statsThreeCols">
        <article className="stat glass">
          <span>Override del dia</span>
          <strong>{exceptions.selectedDayOverride ? 'Activo' : 'Base'}</strong>
          <small>{exceptions.selectedDayOverride ? `${exceptions.selectedDayOverride.windows?.length || 0} franjas especiales` : 'La fecha elegida usa la regla semanal.'}</small>
        </article>
        <article className="stat glass">
          <span>Clausuras del dia</span>
          <strong>{exceptions.selectedDateClosures.length}</strong>
          <small>Impactan la fecha elegida.</small>
        </article>
        <article className="stat glass">
          <span>Proximos ajustes</span>
          <strong>{exceptions.exceptionSummaries.length + exceptions.closureSummaries.length}</strong>
          <small>Excepciones y cierres dentro del rango cargado.</small>
        </article>
      </section>

      <section className="operationsGrid">
        <article className="operationsPanel glass">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Override diario</p>
              <h3>{formatDateLabel(exceptions.selectedDate, true)}</h3>
              <p className="subtle">{exceptions.selectedDayOverride ? 'Este dia ya tiene una excepcion guardada.' : 'Todavia usa la regla semanal.'}</p>
            </div>
            <button className="btn-outline compact" onClick={onOpenDayOverride}>Modificar dia</button>
          </div>

          {exceptions.selectedDayOverride ? (
            <div className="exceptionCallout">
              <span className="miniBadge dayOverride">Override activo</span>
              <strong>{exceptions.selectedDayOverride.windows?.length || 0} franjas definidas</strong>
              <p className="subtle">{(exceptions.selectedDayOverride.windows || []).map((window) => `${window.start_time} a ${window.end_time}`).join(' · ') || 'Sin franjas cargadas'}</p>
            </div>
          ) : (
            <div className="emptyState"><ShieldAlert size={18} /><span>Sin override para esta fecha.</span></div>
          )}
        </article>

        <article className="operationsPanel glass">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Clausuras de la fecha</p>
              <h3>{exceptions.selectedDateClosures.length}</h3>
              <p className="subtle">Cierres que afectan el dia elegido.</p>
            </div>
          </div>

          <div className="listStack">
            {exceptions.selectedDateClosures.length ? exceptions.selectedDateClosures.map((closure) => (
              <div key={closure.id} className="listCard">
                <strong>{closure.courtName}</strong>
                <p className="subtle">{closure.affectedRange}</p>
                {closure.reason ? <small>{closure.reason}</small> : null}
              </div>
            )) : <div className="emptyState"><span>No hay clausuras para esta fecha.</span></div>}
          </div>
        </article>
      </section>

      <section className="operationsGrid">
        <article className="operationsPanel glass">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Dias modificados</p>
              <h3>{exceptions.exceptionSummaries.length}</h3>
            </div>
          </div>
          <div className="listStack">
            {exceptions.exceptionSummaries.length ? exceptions.exceptionSummaries.map((exception) => (
              <div key={exception.id || exception.date} className="listCard">
                <strong>{exception.label}</strong>
                <p className="subtle">{exception.windowsLabel}</p>
              </div>
            )) : <div className="emptyState"><span>No hay excepciones diarias en el rango cargado.</span></div>}
          </div>
        </article>

        <article className="operationsPanel glass">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Clausuras por cancha</p>
              <h3>{exceptions.closureSummaries.length}</h3>
            </div>
          </div>
          <div className="listStack">
            {exceptions.closureSummaries.length ? exceptions.closureSummaries.map((closure) => (
              <div key={closure.id} className="listCard">
                <div className="listCardRow">
                  <div>
                    <strong>{closure.courtName}</strong>
                    <p className="subtle">{closure.affectedRange}</p>
                    {closure.reason ? <small>{closure.reason}</small> : null}
                  </div>
                  <button className="btn-outline compact" onClick={() => onOpenClosure(closure.Court || { id: closure.court_id, name: closure.courtName })}>Editar</button>
                </div>
              </div>
            )) : <div className="emptyState"><span>No hay clausuras cargadas.</span></div>}
          </div>
        </article>
      </section>

      <section className="operationsPanel glass">
        <div className="panelHeader">
          <div>
            <p className="eyebrow">Por cancha</p>
            <h3>{courts.length} canchas monitoreadas</h3>
            <p className="subtle">Crea o edita clausuras puntuales desde la cancha afectada.</p>
          </div>
        </div>
        <div className="compactGrid">
          {courts.map((court) => {
            const courtClosures = exceptions.closuresByCourt[court.id] || [];
            const activeClosure = courtClosures.find((closure) => (
              closure.start_date <= exceptions.selectedDate && closure.end_date >= exceptions.selectedDate
            )) || null;

            return (
              <article key={court.id} className="listCard miniSurfaceCard">
                <div className="listCardRow">
                  <div>
                    <strong>{court.name}</strong>
                    <p className="subtle">{activeClosure ? `${formatDateLabel(activeClosure.start_date)} -> ${formatDateLabel(activeClosure.end_date)}` : 'Sin clausura activa en la fecha elegida.'}</p>
                  </div>
                  {activeClosure ? <span className="miniBadge closed">Activa</span> : <span className="miniBadge free">Libre</span>}
                </div>
                <small>{activeClosure?.reason || 'Puedes cargar una clausura puntual si la cancha sale de operacion.'}</small>
                <div className="cardActions compactActions">
                  <button className="btn-outline compact" onClick={() => onOpenClosure(court)}>{activeClosure ? 'Editar clausura' : 'Nueva clausura'}</button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
