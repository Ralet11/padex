import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../../lib/runtime';
import { formatDateLabel, offsetDateStr, shiftDateStr, todayStr } from '../lib/dates';
import { createRule, createWindow } from '../lib/selectors';
import { getSlotStatus, isManualPartnerReservation, isOperationallyAvailable } from '../lib/slotStatus';

function buildViewRangeForDate(date) {
  return {
    from: shiftDateStr(date, -7),
    to: shiftDateStr(date, 21),
  };
}

function isSameViewRange(current, next) {
  return current?.from === next?.from && current?.to === next?.to;
}

function createPlanningForm(courts = []) {
  return {
    from: todayStr(),
    to: `${new Date().getFullYear()}-12-31`,
    court_ids: courts.map((court) => court.id),
    rules: [
      createRule([1, 2, 3]),
      createRule([4, 5], [createWindow('08:00', '15:00'), createWindow('17:00', '22:00')]),
    ],
  };
}

export function useAgendaData({ venueId, courts, includeRules = true }) {
  const [slots, setSlots] = useState([]);
  const [slotsError, setSlotsError] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [isReleasingBooking, setIsReleasingBooking] = useState(false);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState(todayStr());
  const [agendaFilter, setAgendaFilter] = useState('all');
  const [viewRange, setViewRange] = useState({ from: todayStr(), to: offsetDateStr(27) });
  const [planningForm, setPlanningForm] = useState(() => createPlanningForm(courts));
  const [showAvailabilityBuilder, setShowAvailabilityBuilder] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCourtAgendaModal, setShowCourtAgendaModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAgendaCourt, setSelectedAgendaCourt] = useState(null);
  const [returnToCourtAgenda, setReturnToCourtAgenda] = useState(false);
  const [bookingForm, setBookingForm] = useState({ occupant_name: '', occupant_phone: '', notes: '' });

  useEffect(() => {
    setPlanningForm((prev) => ({
      ...prev,
      court_ids: courts.map((court) => court.id),
    }));
  }, [courts]);

  const applyAvailabilityConfig = useCallback((data) => {
    if (!data?.rules?.length) return;

    setPlanningForm((prev) => ({
      ...prev,
      from: data.from || prev.from,
      to: data.to || prev.to,
      court_ids: Array.isArray(data.court_ids) && data.court_ids.length ? data.court_ids : prev.court_ids,
      rules: data.rules.map((rule) => ({
        id: rule.id || Date.now() + Math.random(),
        weekdays: Array.isArray(rule.weekdays) ? rule.weekdays : [],
        windows: Array.isArray(rule.windows)
          ? rule.windows.map((window) => createWindow(window.start_time, window.end_time))
          : [],
      })),
    }));
  }, []);

  const fetchAvailabilityRules = useCallback(async () => {
    if (!venueId || !includeRules) return;

    try {
      const response = await api.get('/partners/availability-rules');
      applyAvailabilityConfig(response.data);
    } catch (err) {
      console.error(err);
    }
  }, [applyAvailabilityConfig, includeRules, venueId]);

  const fetchSlots = useCallback(async (range = viewRange) => {
    if (!venueId) {
      setSlots([]);
      return [];
    }

    setIsLoadingSlots(true);
    try {
      const response = await api.get('/partners/slots', { params: { from: range.from, to: range.to } });
      const nextSlots = response.data.slots || [];
      setSlots(nextSlots);
      setSlotsError(null);
      return nextSlots;
    } catch (err) {
      console.error(err);
      setSlots([]);
      setSlotsError(err);
      return [];
    } finally {
      setIsLoadingSlots(false);
    }
  }, [venueId, viewRange]);

  useEffect(() => {
    if (!venueId) return;
    fetchSlots();
  }, [fetchSlots, venueId]);

  useEffect(() => {
    if (!venueId || !includeRules) return;
    fetchAvailabilityRules();
  }, [fetchAvailabilityRules, includeRules, venueId]);

  useEffect(() => {
    if (!selectedAgendaDate) {
      setSelectedAgendaDate(todayStr());
    }
  }, [selectedAgendaDate]);

  const syncViewRangeToDate = useCallback((date) => {
    if (!date) return;

    const nextRange = buildViewRangeForDate(date);
    setViewRange((currentRange) => (
      isSameViewRange(currentRange, nextRange) ? currentRange : nextRange
    ));
  }, []);

  useEffect(() => {
    if (!selectedAgendaDate) return;
    if (selectedAgendaDate < viewRange.from || selectedAgendaDate > viewRange.to) {
      syncViewRangeToDate(selectedAgendaDate);
    }
  }, [selectedAgendaDate, syncViewRangeToDate, viewRange.from, viewRange.to]);

  useEffect(() => {
    if (!selectedAgendaDate || courts.length === 0) return;
    const hasDataForSelectedDate = slots.some((slot) => slot.date === selectedAgendaDate);
    const isOutsideLoadedRange = selectedAgendaDate < viewRange.from || selectedAgendaDate > viewRange.to;

    if (!hasDataForSelectedDate && !isOutsideLoadedRange) {
      syncViewRangeToDate(selectedAgendaDate);
    }
  }, [courts.length, selectedAgendaDate, slots, syncViewRangeToDate, viewRange.from, viewRange.to]);

  const selectedDaySlots = useMemo(
    () => slots.filter((slot) => slot.date === selectedAgendaDate),
    [selectedAgendaDate, slots],
  );

  const slotsByCourt = useMemo(() => courts.map((court) => ({
    ...court,
    slots: slots.filter((slot) => slot.Court?.id === court.id),
  })), [courts, slots]);

  const selectedDaySummary = useMemo(() => ({
    date: selectedAgendaDate,
    free: selectedDaySlots.filter((slot) => isOperationallyAvailable(slot)).length,
    occupied: selectedDaySlots.filter((slot) => !isOperationallyAvailable(slot)).length,
    total: selectedDaySlots.length,
  }), [selectedAgendaDate, selectedDaySlots]);

  const hasSlotsForSelectedDate = useMemo(
    () => slots.some((slot) => slot.date === selectedAgendaDate),
    [selectedAgendaDate, slots],
  );

  const summary = useMemo(() => {
    const today = todayStr();
    const todaySlots = slots.filter((slot) => slot.date === today);
    const configuredCourts = slotsByCourt.filter((court) => court.slots.length > 0).length;
    const nextAvailable = [...slots]
      .filter((slot) => isOperationallyAvailable(slot))
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];

    return {
      freeToday: todaySlots.filter((slot) => isOperationallyAvailable(slot)).length,
      occupiedToday: todaySlots.filter((slot) => !isOperationallyAvailable(slot)).length,
      configuredCourts,
      unconfiguredCourts: Math.max(0, courts.length - configuredCourts),
      nextAvailable,
      totalToday: todaySlots.length,
    };
  }, [courts.length, slots, slotsByCourt]);

  const openCourtAgenda = useCallback((court) => {
    setSelectedAgendaCourt(court);
    setShowCourtAgendaModal(true);
  }, []);

  const closeCourtAgenda = useCallback(() => {
    setShowCourtAgendaModal(false);
    setSelectedAgendaCourt(null);
  }, []);

  const openBooking = useCallback((slot) => {
    setReturnToCourtAgenda(true);
    setShowCourtAgendaModal(false);
    setSelectedSlot(slot);
    setBookingForm({ occupant_name: '', occupant_phone: '', notes: '' });
    setShowBookingModal(true);
  }, []);

  const closeBookingModal = useCallback(() => {
    setShowBookingModal(false);
    if (returnToCourtAgenda && selectedAgendaCourt) {
      setShowCourtAgendaModal(true);
    }
  }, [returnToCourtAgenda, selectedAgendaCourt]);

  const refreshAgenda = useCallback(async () => {
    await Promise.all([
      fetchSlots(),
      includeRules ? fetchAvailabilityRules() : Promise.resolve(),
    ]);
  }, [fetchAvailabilityRules, fetchSlots, includeRules]);

  const handleOccupySlot = useCallback(async () => {
    if (!selectedSlot?.id) return;
    if (!bookingForm.occupant_name.trim()) {
      alert('Ingresa el nombre del cliente.');
      return;
    }

    setIsSavingBooking(true);
    try {
      await api.put(`/partners/slots/${selectedSlot.id}/occupy`, bookingForm);
      await fetchSlots();
      setShowBookingModal(false);
      setReturnToCourtAgenda(false);
    } catch (err) {
      alert(`Error ocupando turno: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingBooking(false);
    }
  }, [bookingForm, fetchSlots, selectedSlot?.id]);

  const canReleaseManualBooking = useCallback((slot) => (
    Boolean(slot?.id) && isManualPartnerReservation(slot)
  ), []);

  const handleReleaseSlot = useCallback(async (slot) => {
    if (!slot?.id || !canReleaseManualBooking(slot)) return;

    const confirmed = window.confirm(`Se va a liberar el turno de ${slot.Court?.name || 'la cancha'} el ${formatDateLabel(slot.date, true)} en la franja ${slot.time}.`);
    if (!confirmed) return;

    setIsReleasingBooking(true);
    try {
      await api.delete(`/partners/slots/${slot.id}/occupy`);
      await fetchSlots();
    } catch (err) {
      alert(`Error liberando turno: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsReleasingBooking(false);
    }
  }, [canReleaseManualBooking, fetchSlots]);

  const toggleCourt = useCallback((courtId) => {
    setPlanningForm((prev) => ({
      ...prev,
      court_ids: prev.court_ids.includes(courtId)
        ? prev.court_ids.filter((id) => id !== courtId)
        : [...prev.court_ids, courtId],
    }));
  }, []);

  const toggleRuleWeekday = useCallback((ruleId, weekday) => {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id !== ruleId) return rule;
        const weekdays = rule.weekdays.includes(weekday)
          ? rule.weekdays.filter((day) => day !== weekday)
          : [...rule.weekdays, weekday].sort((a, b) => a - b);
        return { ...rule, weekdays };
      }),
    }));
  }, []);

  const addRule = useCallback(() => {
    setPlanningForm((prev) => ({
      ...prev,
      rules: [...prev.rules, createRule([], [createWindow('08:00', '09:30')])],
    }));
  }, []);

  const removeRule = useCallback((ruleId) => {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.length === 1 ? prev.rules : prev.rules.filter((rule) => rule.id !== ruleId),
    }));
  }, []);

  const addTimeWindow = useCallback((ruleId) => {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => (rule.id === ruleId
        ? { ...rule, windows: [...rule.windows, createWindow('08:00', '09:30')] }
        : rule)),
    }));
  }, []);

  const updateTimeWindow = useCallback((ruleId, windowId, field, value) => {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => (rule.id === ruleId
        ? { ...rule, windows: rule.windows.map((window) => (window.id === windowId ? { ...window, [field]: value } : window)) }
        : rule)),
    }));
  }, []);

  const removeTimeWindow = useCallback((ruleId, windowId) => {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id !== ruleId) return rule;
        return { ...rule, windows: rule.windows.length === 1 ? rule.windows : rule.windows.filter((window) => window.id !== windowId) };
      }),
    }));
  }, []);

  const handleGenerateSlots = useCallback(async () => {
    if (planningForm.court_ids.length === 0) {
      alert('Selecciona al menos una cancha.');
      return;
    }

    const validRules = planningForm.rules.filter((rule) => rule.weekdays.length > 0 && rule.windows.length > 0);
    if (validRules.length === 0) {
      alert('Define al menos una regla semanal con dias y horarios.');
      return;
    }

    setIsGeneratingSlots(true);
    try {
      await api.put('/partners/availability-rules', {
        court_ids: planningForm.court_ids,
        rules: validRules.map((rule) => ({
          weekdays: rule.weekdays,
          windows: rule.windows.map((window) => ({
            start_time: window.start_time,
            end_time: window.end_time,
          })),
        })),
        from: planningForm.from,
        to: planningForm.to,
      });

      const nextRange = { from: planningForm.from, to: planningForm.to };
      setViewRange(nextRange);
      await Promise.all([fetchSlots(nextRange), fetchAvailabilityRules()]);
      alert('Disponibilidad guardada.');
      setShowAvailabilityBuilder(false);
    } catch (err) {
      alert(`Error guardando disponibilidad: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingSlots(false);
    }
  }, [fetchAvailabilityRules, fetchSlots, planningForm]);

  return {
    slots,
    slotsError,
    isLoadingSlots,
    isGeneratingSlots,
    isSavingBooking,
    isReleasingBooking,
    selectedAgendaDate,
    setSelectedAgendaDate,
    agendaFilter,
    setAgendaFilter,
    viewRange,
    setViewRange,
    planningForm,
    setPlanningForm,
    showAvailabilityBuilder,
    setShowAvailabilityBuilder,
    showBookingModal,
    setShowBookingModal,
    showCourtAgendaModal,
    setShowCourtAgendaModal,
    selectedSlot,
    selectedAgendaCourt,
    bookingForm,
    setBookingForm,
    selectedDaySlots,
    selectedDaySummary,
    slotsByCourt,
    hasSlotsForSelectedDate,
    isSelectedDateHydrating: isLoadingSlots && !hasSlotsForSelectedDate,
    isTodaySelected: selectedAgendaDate === todayStr(),
    summary,
    refreshAgenda,
    fetchSlots,
    fetchAvailabilityRules,
    openCourtAgenda,
    closeCourtAgenda,
    openBooking,
    closeBookingModal,
    handleOccupySlot,
    handleReleaseSlot,
    canReleaseManualBooking,
    toggleCourt,
    toggleRuleWeekday,
    addRule,
    removeRule,
    addTimeWindow,
    updateTimeWindow,
    removeTimeWindow,
    handleGenerateSlots,
    formatDateLabel,
    shiftDateStr,
    todayStr,
    getSlotStatus,
    isOperationallyAvailable,
  };
}
