import React from 'react';
import { COURT_ENCLOSURE_OPTIONS, COURT_SURFACE_OPTIONS } from '../../dashboard/venueCatalog';

const COURT_TYPES = ['Cristal', 'Muro', 'Panoramica'];

export default function CourtEditorModal({
  open,
  courtForm,
  setCourtForm,
  isSavingCourt,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal glass">
        <h3>{courtForm.id ? 'Editar cancha' : 'Nueva cancha'}</h3>
        <p className="subtle">Completa nombre, tipo, superficie y cerramiento para que la agenda y los filtros queden alineados.</p>
        <label><span>Nombre de referencia</span><input type="text" value={courtForm.name} onChange={(e) => setCourtForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ej: Cancha Central" autoFocus /></label>
        <label><span>Material / tipo</span><select value={courtForm.type} onChange={(e) => setCourtForm((prev) => ({ ...prev, type: e.target.value }))}>{COURT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label><span>Superficie</span><select value={courtForm.surface} onChange={(e) => setCourtForm((prev) => ({ ...prev, surface: e.target.value }))}><option value="">Sin definir</option>{COURT_SURFACE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Cerramiento</span><select value={courtForm.enclosure} onChange={(e) => setCourtForm((prev) => ({ ...prev, enclosure: e.target.value }))}><option value="">Sin definir</option>{COURT_ENCLOSURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        <label><span>Imagen</span><input type="text" value={courtForm.image} onChange={(e) => setCourtForm((prev) => ({ ...prev, image: e.target.value }))} placeholder="/uploads/... o URL" /></label>

        <div className="modalActions">
          <button className="btn-secondary" onClick={onClose} disabled={isSavingCourt}>Cancelar</button>
          <button className="btn-primary-sm" onClick={onSubmit} disabled={!courtForm.name.trim() || isSavingCourt}>{isSavingCourt ? 'Guardando...' : (courtForm.id ? 'Guardar cambios' : 'Guardar cancha')}</button>
        </div>
      </div>
    </div>
  );
}
