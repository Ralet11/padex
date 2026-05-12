import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/runtime';
import { formatDateLabel, todayStr } from '../lib/dates';
import { createWindow, slotsToWindows } from '../lib/selectors';

function buildExceptionSummary(exception) {
  const windows = Array.isArray(exception?.windows) ? exception.windows : [];
  return {
    ...exception,
    label: formatDateLabel(exception.date, true),
    windowsLabel: windows.length
      ? windows.map((window) => `${window.start_time} a ${window.end_time}`).join(' · ')
      : 'Sin franjas configuradas',
  };
}

function buildClosureSummary(closure) {
  return {
    ...closure,
    courtName: closure.Court?.name || 'Cancha sin nombre',
    affectedRange: `${formatDateLabel(closure.start_date)} → ${formatDateLabel(closure.end_date)}`,
  };
}

export function useExceptionsData({ venueId, courts, viewRange, planningTo }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [exceptions, setExceptions] = useState([]);
  const [courtClosures, setCourtClosures] = useState([]);
  const [exceptionsError, setExceptionsError] = useState(null);
  const [isLoadingExceptions, setIsLoadingExceptions] = useState(false);
  const [isSavingDayOverride, setIsSavingDayOverride] = useState(false);
  const [isSavingClosure, setIsSavingClosure] = useState(false);
  const [showDayOverrideModal, setShowDayOverrideModal] = useState(false);
  const [showCourtClosureModal, setShowCourtClosureModal] = useState(false);
  const [selectedClosureCourt, setSelectedClosureCourt] = useState(null);
  const [dayOverrideForm, setDayOverrideForm] = useState({ windows: [createWindow('08:00', '15:00')] });
  const [courtClosureForm, setCourtClosureForm] = useState({ start_date: todayStr(), end_date: todayStr(), reason: '' });

  const fetchExceptions = useCallback(async () => {
    if (!venueId) {
      setExceptions([]);
      return [];
    }

    try {
      const response = await api.get('/partners/availability-exceptions', {
        params: { from: viewRange.from, to: viewRange.to },
      });
      const nextExceptions = response.data.exceptions || [];
      setExceptions(nextExceptions);
      return nextExceptions;
    } catch (err) {
      console.error(err);
      setExceptions([]);
      setExceptionsError(err);
      return [];
    }
  }, [venueId, viewRange.from, viewRange.to]);

  const fetchClosures = useCallback(async () => {
    if (!venueId) {
      setCourtClosures([]);
      return [];
    }

    try {
      const response = await api.get('/partners/court-closures', {
        params: {
          from: viewRange.from < todayStr() ? viewRange.from : todayStr(),
          to: planningTo > viewRange.to ? planningTo : viewRange.to,
        },
      });
      const nextClosures = response.data.closures || [];
      setCourtClosures(nextClosures);
      return nextClosures;
    } catch (err) {
      console.error(err);
      setCourtClosures([]);
      setExceptionsError(err);
      return [];
    }
  }, [planningTo, venueId, viewRange.from, viewRange.to]);

  const refreshExceptions = useCallback(async () => {
    setIsLoadingExceptions(true);
    try {
      await Promise.all([fetchExceptions(), fetchClosures()]);
      setExceptionsError(null);
    } finally {
      setIsLoadingExceptions(false);
    }
  }, [fetchClosures, fetchExceptions]);

  useEffect(() => {
    if (!venueId) return;
    refreshExceptions();
  }, [refreshExceptions, venueId]);

  const exceptionMap = useMemo(
    () => Object.fromEntries(exceptions.map((item) => [item.date, item])),
    [exceptions],
  );

  const closuresByCourt = useMemo(
    () => courts.reduce((acc, court) => {
      acc[court.id] = courtClosures
        .filter((closure) => closure.court_id === court.id)
        .sort((a, b) => `${a.start_date}${a.end_date}`.localeCompare(`${b.start_date}${b.end_date}`));
      return acc;
    }, {}),
    [courtClosures, courts],
  );

  const selectedDayOverride = exceptionMap[selectedDate] || null;
  const exceptionSummaries = useMemo(() => exceptions.map(buildExceptionSummary), [exceptions]);
  const closureSummaries = useMemo(() => courtClosures.map(buildClosureSummary), [courtClosures]);
  const urgentClosures = useMemo(
    () => closureSummaries.filter((closure) => closure.start_date <= todayStr() && closure.end_date >= todayStr()),
    [closureSummaries],
  );
  const selectedDateClosures = useMemo(
    () => closureSummaries.filter((closure) => closure.start_date <= selectedDate && closure.end_date >= selectedDate),
    [closureSummaries, selectedDate],
  );

  const openDayOverride = useCallback((seedSlots = []) => {
    setDayOverrideForm({
      windows: selectedDayOverride?.windows?.length
        ? selectedDayOverride.windows.map((window) => createWindow(window.start_time, window.end_time))
        : seedSlots.length
          ? slotsToWindows(seedSlots)
          : [createWindow('08:00', '15:00')],
    });
    setShowDayOverrideModal(true);
  }, [selectedDayOverride]);

  const addDayOverrideWindow = useCallback(() => {
    setDayOverrideForm((prev) => ({ ...prev, windows: [...prev.windows, createWindow('08:00', '09:30')] }));
  }, []);

  const updateDayOverrideWindow = useCallback((windowId, field, value) => {
    setDayOverrideForm((prev) => ({
      ...prev,
      windows: prev.windows.map((window) => (window.id === windowId ? { ...window, [field]: value } : window)),
    }));
  }, []);

  const removeDayOverrideWindow = useCallback((windowId) => {
    setDayOverrideForm((prev) => ({
      ...prev,
      windows: prev.windows.length === 1 ? prev.windows : prev.windows.filter((window) => window.id !== windowId),
    }));
  }, []);

  const saveDayOverride = useCallback(async () => {
    setIsSavingDayOverride(true);
    try {
      await api.put('/partners/availability-exceptions', {
        date: selectedDate,
        windows: dayOverrideForm.windows.map((window) => ({
          start_time: window.start_time,
          end_time: window.end_time,
        })),
      });
      await refreshExceptions();
      setShowDayOverrideModal(false);
    } catch (err) {
      alert(`Error guardando disponibilidad del dia: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingDayOverride(false);
    }
  }, [dayOverrideForm.windows, refreshExceptions, selectedDate]);

  const clearDayOverride = useCallback(async () => {
    setIsSavingDayOverride(true);
    try {
      await api.put('/partners/availability-exceptions', { date: selectedDate, windows: [] });
      await refreshExceptions();
      setShowDayOverrideModal(false);
    } catch (err) {
      alert(`Error limpiando la excepción del dia: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingDayOverride(false);
    }
  }, [refreshExceptions, selectedDate]);

  const openCourtClosure = useCallback((court) => {
    const activeClosureForSelectedDate = (closuresByCourt[court.id] || []).find((closure) => (
      closure.start_date <= selectedDate && closure.end_date >= selectedDate
    )) || null;
    setSelectedClosureCourt(court);
    setCourtClosureForm({
      start_date: activeClosureForSelectedDate?.start_date || selectedDate || todayStr(),
      end_date: activeClosureForSelectedDate?.end_date || selectedDate || todayStr(),
      reason: activeClosureForSelectedDate?.reason || '',
    });
    setShowCourtClosureModal(true);
  }, [closuresByCourt, selectedDate]);

  const saveCourtClosure = useCallback(async () => {
    if (!selectedClosureCourt?.id) return;

    setIsSavingClosure(true);
    try {
      await api.post('/partners/court-closures', {
        court_id: selectedClosureCourt.id,
        start_date: courtClosureForm.start_date,
        end_date: courtClosureForm.end_date,
        reason: courtClosureForm.reason,
      });
      await refreshExceptions();
      setShowCourtClosureModal(false);
    } catch (err) {
      alert(`Error guardando clausura: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingClosure(false);
    }
  }, [courtClosureForm.end_date, courtClosureForm.reason, courtClosureForm.start_date, refreshExceptions, selectedClosureCourt?.id]);

  const removeCourtClosure = useCallback(async (closureId) => {
    setIsSavingClosure(true);
    try {
      await api.delete(`/partners/court-closures/${closureId}`);
      await refreshExceptions();
      setShowCourtClosureModal(false);
    } catch (err) {
      alert(`Error eliminando clausura: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingClosure(false);
    }
  }, [refreshExceptions]);

  return {
    selectedDate,
    setSelectedDate,
    exceptions,
    courtClosures,
    exceptionsError,
    isLoadingExceptions,
    isSavingDayOverride,
    isSavingClosure,
    showDayOverrideModal,
    setShowDayOverrideModal,
    showCourtClosureModal,
    setShowCourtClosureModal,
    selectedClosureCourt,
    dayOverrideForm,
    courtClosureForm,
    setCourtClosureForm,
    exceptionMap,
    closuresByCourt,
    selectedDayOverride,
    exceptionSummaries,
    closureSummaries,
    urgentClosures,
    selectedDateClosures,
    refreshExceptions,
    openDayOverride,
    addDayOverrideWindow,
    updateDayOverrideWindow,
    removeDayOverrideWindow,
    saveDayOverride,
    clearDayOverride,
    openCourtClosure,
    saveCourtClosure,
    removeCourtClosure,
  };
}
