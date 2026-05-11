import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

const WEEKDAYS = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miércoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sábado' },
  { value: 0, short: 'D', label: 'Domingo' },
];

export default function AvailabilityBuilderModal({
  open,
  courts,
  planningForm,
  setPlanningForm,
  isGeneratingSlots,
  toggleCourt,
  toggleRuleWeekday,
  addRule,
  removeRule,
  addTimeWindow,
  updateTimeWindow,
  removeTimeWindow,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal glass availabilityModal">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Disponibilidad semanal</p>
            <h3>Guardar reglas semanales</h3>
            <p className="subtle">Cada regla agrupa días que comparten los mismos horarios para mantener la agenda consistente.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="twoCols">
          <label><span>Desde</span><input type="date" value={planningForm.from} onChange={(e) => setPlanningForm((prev) => ({ ...prev, from: e.target.value }))} /></label>
          <label><span>Hasta</span><input type="date" value={planningForm.to} onChange={(e) => setPlanningForm((prev) => ({ ...prev, to: e.target.value }))} /></label>
        </div>

        <label>
          <span>Canchas incluidas</span>
          <div className="chipWrap">
            {courts.map((court) => (
              <button
                key={court.id}
                type="button"
                className={`chip ${planningForm.court_ids.includes(court.id) ? 'active' : ''}`}
                onClick={() => toggleCourt(court.id)}
              >
                {court.name}
              </button>
            ))}
          </div>
        </label>

        <div className="ruleList">
          {planningForm.rules.map((rule, index) => (
            <section key={rule.id} className="ruleCard">
              <div className="ruleHeader">
                <div>
                  <strong>Regla {index + 1}</strong>
                  <small>Días con el mismo esquema horario</small>
                </div>
                <button type="button" className="icon-btn danger" onClick={() => removeRule(rule.id)} disabled={planningForm.rules.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>

              <label>
                <span>Días</span>
                <div className="chipWrap">
                  {WEEKDAYS.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      className={`chip ${rule.weekdays.includes(day.value) ? 'active' : ''}`}
                      onClick={() => toggleRuleWeekday(rule.id, day.value)}
                      title={day.label}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </label>

              <div className="windowList">
                {rule.windows.map((window, windowIndex) => (
                  <div key={window.id} className="windowRow">
                    <strong>Franja {windowIndex + 1}</strong>
                    <input type="time" value={window.start_time} onChange={(e) => updateTimeWindow(rule.id, window.id, 'start_time', e.target.value)} />
                    <span>a</span>
                    <input type="time" value={window.end_time} onChange={(e) => updateTimeWindow(rule.id, window.id, 'end_time', e.target.value)} />
                    <button type="button" className="icon-btn danger" onClick={() => removeTimeWindow(rule.id, window.id)} disabled={rule.windows.length === 1}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                <button type="button" className="btn-secondary addWindow" onClick={() => addTimeWindow(rule.id)}>
                  <Plus size={14} />
                  Agregar franja a esta regla
                </button>
              </div>
            </section>
          ))}

          <button type="button" className="btn-secondary addRule" onClick={addRule}>
            <Plus size={14} />
            Agregar otra regla semanal
          </button>
        </div>

        <div className="note">El sistema proyecta estas reglas sobre todo el período elegido.</div>

        <div className="modalActions">
          <button className="btn-secondary" onClick={onClose} disabled={isGeneratingSlots}>Cancelar</button>
          <button className="btn-outline" onClick={onSubmit} disabled={isGeneratingSlots}>{isGeneratingSlots ? 'Guardando...' : 'Guardar disponibilidad'}</button>
        </div>
      </div>
    </div>
  );
}
