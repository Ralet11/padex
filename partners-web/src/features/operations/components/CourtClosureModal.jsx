import React from 'react';

export default function CourtClosureModal({
  open,
  selectedClosureCourt,
  courtClosureForm,
  setCourtClosureForm,
  isSavingClosure,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal glass">
        <h3>Clausurar cancha</h3>
        <p className="subtle">Define por cuánto tiempo quedará fuera de servicio {selectedClosureCourt?.name || 'esta cancha'}.</p>

        <div className="twoCols">
          <label><span>Desde</span><input type="date" value={courtClosureForm.start_date} onChange={(e) => setCourtClosureForm((prev) => ({ ...prev, start_date: e.target.value }))} /></label>
          <label><span>Hasta</span><input type="date" value={courtClosureForm.end_date} onChange={(e) => setCourtClosureForm((prev) => ({ ...prev, end_date: e.target.value }))} /></label>
        </div>

        <label><span>Motivo</span><input type="text" value={courtClosureForm.reason} onChange={(e) => setCourtClosureForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Ej: mantenimiento, torneo, reparación" /></label>

        <div className="modalActions">
          <button className="btn-secondary" onClick={onClose} disabled={isSavingClosure}>Cancelar</button>
          <button className="btn-primary-sm" onClick={onSubmit} disabled={isSavingClosure}>{isSavingClosure ? 'Guardando...' : 'Guardar clausura'}</button>
        </div>
      </div>
    </div>
  );
}
