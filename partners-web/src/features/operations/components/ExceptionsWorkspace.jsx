import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function ExceptionsWorkspace({ courts, exceptions, formatDateLabel, onOpenDayOverride, onOpenClosure }) {
  return (
    <div className="stack">
      <section className="hero glass compactHero">
        <div>
          <p className="eyebrow">Excepciones</p>
          <h2>Overrides y cierres</h2>
          <p className="subtle">Separá cambios diarios de la planificación recurrente y visualizá su rango de impacto real.</p>
        </div>
        <div className="actions">
          <button className="btn-outline" onClick={onOpenDayOverride}>Modificar día seleccionado</button>
        </div>
      </section>

      <section className="stats statsThreeCols">
        <article className="stat glass">
          <span>Override del día</span>
          <strong>{exceptions.selectedDayOverride ? 'Activo' : 'Base'}</strong>
          <small>{exceptions.selectedDayOverride ? `${exceptions.selectedDayOverride.windows?.length || 0} franjas especiales` : 'Hoy sigue usando la regla semanal.'}</small>
        </article>
        <article className="stat glass">
          <span>Clausuras activas</span>
          <strong>{exceptions.urgentClosures.length}</strong>
          <small>Impactan disponibilidad y lectura operativa actual.</small>
        </article>
        <article className="stat glass">
          <span>Próximos ajustes</span>
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
              <p className="subtle">{exceptions.selectedDayOverride ? 'Este día ya tiene una excepción guardada.' : 'Todavía usa la regla semanal.'}</p>
            </div>
            <button className="btn-primary-sm" onClick={onOpenDayOverride}>Editar día</button>
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
              <p className="eyebrow">Clausuras activas</p>
              <h3>{exceptions.urgentClosures.length}</h3>
              <p className="subtle">Incidentes operativos que impactan la disponibilidad actual.</p>
            </div>
          </div>

          <div className="listStack">
            {exceptions.urgentClosures.length ? exceptions.urgentClosures.map((closure) => (
              <div key={closure.id} className="listCard">
                <strong>{closure.courtName}</strong>
                <p className="subtle">{closure.affectedRange}</p>
                {closure.reason ? <small>{closure.reason}</small> : null}
              </div>
            )) : <div className="emptyState"><span>No hay clausuras activas hoy.</span></div>}
          </div>
        </article>
      </section>

      <section className="operationsGrid">
        <article className="operationsPanel glass">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Historial de días modificados</p>
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
            <p className="eyebrow">Cierres por inventario</p>
            <h3>{courts.length} canchas monitoreadas</h3>
            <p className="subtle">Abrí una clausura nueva desde la cancha afectada para no mezclar incidentes con configuración diaria.</p>
          </div>
        </div>
        <div className="compactGrid">
          {courts.map((court) => {
            const courtClosures = exceptions.closuresByCourt[court.id] || [];
            const activeClosure = courtClosures.find((closure) => closure.end_date >= exceptions.selectedDate) || null;

            return (
              <article key={court.id} className="listCard miniSurfaceCard">
                <div className="listCardRow">
                  <div>
                    <strong>{court.name}</strong>
                    <p className="subtle">{activeClosure ? `${formatDateLabel(activeClosure.start_date)} → ${formatDateLabel(activeClosure.end_date)}` : 'Sin clausura activa en la fecha elegida.'}</p>
                  </div>
                  {activeClosure ? <span className="miniBadge closed">Activa</span> : <span className="miniBadge free">Libre</span>}
                </div>
                <small>{activeClosure?.reason || 'Podés cargar una clausura puntual si la cancha sale de operación.'}</small>
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
