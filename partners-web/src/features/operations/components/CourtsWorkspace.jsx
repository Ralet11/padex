import React from 'react';
import { Building2, Plus } from 'lucide-react';
import { ENCLOSURE_LABELS, SURFACE_LABELS } from '../../dashboard/venueCatalog';

export default function CourtsWorkspace({ courtsData, formatDateLabel, onOpenClosure, onRemoveClosure, isSavingClosure }) {
  const totalCourts = courtsData.courtCards.length;
  const activeClosures = courtsData.courtCards.filter((court) => court.currentClosure).length;
  const courtsWithoutSlots = courtsData.courtCards.filter((court) => court.slots.length === 0).length;

  return (
    <div className="stack">
      <section className="hero glass">
        <div>
          <p className="eyebrow">Canchas</p>
          <h2>Infraestructura</h2>
          <p className="subtle">Cada cancha define el inventario real que impacta agenda, cierres y disponibilidad.</p>
        </div>
        <button className="btn-primary-sm" onClick={() => courtsData.openCourtEditor()}><Plus size={16} />Agregar cancha</button>
      </section>

      <section className="stats statsThreeCols">
        <article className="stat glass">
          <span>Inventario total</span>
          <strong>{totalCourts}</strong>
          <small>Canchas cargadas en la sede.</small>
        </article>
        <article className="stat glass">
          <span>Fuera de operación</span>
          <strong>{activeClosures}</strong>
          <small>Con clausura activa o vigente.</small>
        </article>
        <article className="stat glass">
          <span>Sin agenda visible</span>
          <strong>{courtsWithoutSlots}</strong>
          <small>Revisá reglas o publicación de disponibilidad.</small>
        </article>
      </section>

      <section className="courtCards">
        {courtsData.courtCards.map((court) => (
          <article key={court.id} className="courtCard glass">
            <div className="iconBox"><Building2 size={28} /></div>
            <div className="cardBody">
              <h3>{court.name}</h3>
              <p>Tipo: {court.type || 'Sin tipo'} · turnos de 1.5 hs</p>
               <div className="meta courtMeta">
                 <span>{court.surface ? (SURFACE_LABELS[court.surface] || court.surface) : 'Superficie pendiente'}</span>
                 <span>{court.enclosure ? (ENCLOSURE_LABELS[court.enclosure] || court.enclosure) : 'Cerramiento pendiente'}</span>
                 <span>{court.type || 'Tipo pendiente'}</span>
               </div>
               <div className="meta">
                 <span>{court.slots.length} turnos</span>
                 <span>{court.freeCount} disponibles</span>
                {court.currentClosure ? <span className="metaAlert">Clausurada hasta {formatDateLabel(court.currentClosure.end_date)}</span> : <span className="metaOk">Operativa</span>}
              </div>
              {court.currentClosure ? <p className="closureInfo">Desde {formatDateLabel(court.currentClosure.start_date)} hasta {formatDateLabel(court.currentClosure.end_date)}{court.currentClosure.reason ? ` · ${court.currentClosure.reason}` : ''}</p> : null}
              <div className="cardActions">
                <button type="button" className="btn-secondary compact" onClick={() => courtsData.openCourtEditor(court)}>Editar cancha</button>
                <button type="button" className="btn-outline compact" onClick={() => onOpenClosure(court)}>{court.currentClosure ? 'Editar clausura' : 'Clausurar cancha'}</button>
                {court.currentClosure ? <button type="button" className="btn-secondary compact dangerGhost" onClick={() => onRemoveClosure(court.currentClosure.id)} disabled={isSavingClosure}>Quitar clausura</button> : null}
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
