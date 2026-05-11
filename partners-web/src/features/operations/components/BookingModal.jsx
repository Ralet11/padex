import React from 'react';
import { formatSlotRange } from '../lib/agendaBoard';

export default function BookingModal({
  open,
  selectedSlot,
  bookingForm,
  setBookingForm,
  isSavingBooking,
  formatDateLabel,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal glass">
        <p className="eyebrow">Reserva manual</p>
        <h3>Confirmar turno</h3>
        <p className="subtle">Vas a ocupar {selectedSlot?.Court?.name || 'la cancha'} el {selectedSlot ? formatDateLabel(selectedSlot.date, true) : ''} en la franja {selectedSlot ? formatSlotRange(selectedSlot) : '--:--'}.</p>

        <div className="bookingContext">
          <span className="contextPill">{selectedSlot?.Court?.name || 'Cancha'}</span>
          <span className="contextPill">{selectedSlot ? formatDateLabel(selectedSlot.date, true) : 'Fecha'}</span>
          <span className="contextPill strong">{selectedSlot ? formatSlotRange(selectedSlot) : '--:--'}</span>
        </div>

        <label><span>Nombre del cliente</span><input type="text" value={bookingForm.occupant_name} onChange={(e) => setBookingForm((prev) => ({ ...prev, occupant_name: e.target.value }))} placeholder="Ej: Carlos Páez" /></label>
        <label><span>Teléfono</span><input type="text" value={bookingForm.occupant_phone} onChange={(e) => setBookingForm((prev) => ({ ...prev, occupant_phone: e.target.value }))} placeholder="+54 9 ..." /></label>
        <label><span>Notas</span><textarea value={bookingForm.notes} onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Pagado por adelantado..." /></label>

        <div className="modalActions">
          <button className="btn-secondary" onClick={onClose} disabled={isSavingBooking}>Cancelar</button>
          <button className="btn-primary-sm" onClick={onSubmit} disabled={isSavingBooking}>{isSavingBooking ? 'Guardando...' : 'Ocupar turno'}</button>
        </div>
      </div>
    </div>
  );
}
