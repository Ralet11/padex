import React from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function DayOverrideModal({
  open,
  selectedDate,
  formatDateLabel,
  dayOverrideForm,
  isSavingDayOverride,
  hasSelectedDayOverride,
  updateDayOverrideWindow,
  removeDayOverrideWindow,
  addDayOverrideWindow,
  onClose,
  onSubmit,
  onClear,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal glass availabilityModal">
        <div className="modalHeader">
          <div>
            <p className="eyebrow">Disponibilidad del día</p>
            <h3>{selectedDate ? formatDateLabel(selectedDate, true) : ''}</h3>
            <p className="subtle">Esto pisa la regla semanal solo para esta fecha y aplica a todas las canchas de la sede.</p>
          </div>
          <button className="icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="windowList">
          {dayOverrideForm.windows.map((window, index) => (
            <div key={window.id} className="windowRow">
              <strong>Franja {index + 1}</strong>
              <input type="time" value={window.start_time} onChange={(e) => updateDayOverrideWindow(window.id, 'start_time', e.target.value)} />
              <span>a</span>
              <input type="time" value={window.end_time} onChange={(e) => updateDayOverrideWindow(window.id, 'end_time', e.target.value)} />
              <button type="button" className="icon-btn danger" onClick={() => removeDayOverrideWindow(window.id)} disabled={dayOverrideForm.windows.length === 1}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <button type="button" className="btn-secondary addWindow" onClick={addDayOverrideWindow}>
            <Plus size={14} />
            Agregar franja
          </button>
        </div>

        <div className="modalActions">
          <button className="btn-secondary" onClick={onClose} disabled={isSavingDayOverride}>Cancelar</button>
          {hasSelectedDayOverride ? <button className="btn-outline" onClick={onClear} disabled={isSavingDayOverride}>Limpiar día</button> : null}
          <button className="btn-primary-sm" onClick={onSubmit} disabled={isSavingDayOverride}>{isSavingDayOverride ? 'Guardando...' : 'Guardar disponibilidad del día'}</button>
        </div>
      </div>
    </div>
  );
}
