import { useCallback, useMemo, useState } from 'react';
import { api } from '../../../lib/runtime';
import { createCourtFormState, EMPTY_COURT_FORM } from '../lib/selectors';
import { isOperationallyAvailable } from '../lib/slotStatus';

export function useCourtsData({ courts, slotsByCourt, closuresByCourt, onVenueRefresh }) {
  const [isSavingCourt, setIsSavingCourt] = useState(false);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [courtForm, setCourtForm] = useState(EMPTY_COURT_FORM);

  const courtCards = useMemo(() => slotsByCourt.map((court) => {
    const freeCount = court.slots.filter((slot) => isOperationallyAvailable(slot)).length;
    const currentClosure = (closuresByCourt[court.id] || []).find((closure) => closure.end_date >= new Date().toISOString().slice(0, 10)) || null;
    return {
      ...court,
      freeCount,
      currentClosure,
    };
  }), [closuresByCourt, slotsByCourt]);

  const openCourtEditor = useCallback((court = null) => {
    setCourtForm(createCourtFormState(court));
    setShowAddCourtModal(true);
  }, []);

  const closeCourtEditor = useCallback(() => {
    setShowAddCourtModal(false);
    setCourtForm({ ...EMPTY_COURT_FORM });
  }, []);

  const handleSaveCourt = useCallback(async () => {
    const name = courtForm.name.trim();
    if (!name) return;

    setIsSavingCourt(true);
    try {
      const payload = {
        name,
        type: courtForm.type,
        image: courtForm.image.trim(),
        surface: courtForm.surface || null,
        enclosure: courtForm.enclosure || null,
      };

      if (courtForm.id) {
        await api.put(`/partners/courts/${courtForm.id}`, payload);
      } else {
        await api.post('/partners/courts', payload);
      }

      await onVenueRefresh?.();
      closeCourtEditor();
    } catch (err) {
      alert(`Error al guardar la cancha: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingCourt(false);
    }
  }, [closeCourtEditor, courtForm, onVenueRefresh]);

  return {
    courts,
    courtCards,
    isSavingCourt,
    showAddCourtModal,
    courtForm,
    setCourtForm,
    openCourtEditor,
    closeCourtEditor,
    handleSaveCourt,
  };
}
