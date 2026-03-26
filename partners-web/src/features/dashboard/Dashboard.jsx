import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Building2, Calendar, ChevronDown, CircleDot, Clock3, DollarSign, Image as ImageIcon, LayoutDashboard, LogOut, Mail, MapPin, Phone, Plus, Settings, Trash2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

const COURT_TYPES = ['Cristal', 'Muro', 'Panoramica'];
const WEEKDAYS = [
  { value: 1, short: 'L', label: 'Lunes' },
  { value: 2, short: 'M', label: 'Martes' },
  { value: 3, short: 'X', label: 'Miercoles' },
  { value: 4, short: 'J', label: 'Jueves' },
  { value: 5, short: 'V', label: 'Viernes' },
  { value: 6, short: 'S', label: 'Sabado' },
  { value: 0, short: 'D', label: 'Domingo' },
];

function todayStr() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function offsetDateStr(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shiftDateStr(dateStr, offsetDays) {
  const date = new Date(`${dateStr}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createWindow(start_time = '08:00', end_time = '15:00') {
  return { id: Date.now() + Math.random(), start_time, end_time };
}

function createRule(weekdays = [1, 2, 3], windows = [createWindow('08:00', '15:00'), createWindow('17:00', '23:30')]) {
  return { id: Date.now() + Math.random(), weekdays, windows };
}

function slotsToWindows(slots) {
  const sorted = [...slots].sort((a, b) => a.time.localeCompare(b.time));
  if (!sorted.length) return [createWindow('08:00', '15:00')];

  const windows = [];
  let start = sorted[0].time;
  let lastMinutes = sorted[0].time.split(':').map(Number).reduce((h, m) => h * 60 + m);

  for (let i = 1; i < sorted.length; i++) {
    const currentMinutes = sorted[i].time.split(':').map(Number).reduce((h, m) => h * 60 + m);
    if (currentMinutes !== lastMinutes + 90) {
      const endMinutes = lastMinutes + 90;
      windows.push(createWindow(start, `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`));
      start = sorted[i].time;
    }
    lastMinutes = currentMinutes;
  }

  const finalEndMinutes = lastMinutes + 90;
  windows.push(createWindow(start, `${String(Math.floor(finalEndMinutes / 60)).padStart(2, '0')}:${String(finalEndMinutes % 60).padStart(2, '0')}`));
  return windows;
}

function formatDateLabel(dateStr, long = false) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('es-AR', long
    ? { weekday: 'long', day: 'numeric', month: 'long' }
    : { weekday: 'short', day: 'numeric', month: 'short' });
}

function getSlotStatus(slot) {
  if (slot.is_available) return { key: 'free', label: 'Libre', detail: 'Disponible' };
  if (slot.booked_externally) return { key: 'busy', label: 'Ocupado', detail: slot.occupant_name || 'Reserva manual' };
  return { key: 'busy', label: 'Reservado', detail: 'Tomado por la app' };
}

export default function Dashboard({ venue, onLogout, onVenueRefresh }) {
  const [activeTab, setActiveTab] = useState('planning');
  const [courts, setCourts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedAgendaDate, setSelectedAgendaDate] = useState('');
  const [agendaFilter, setAgendaFilter] = useState('all');
  const [viewRange, setViewRange] = useState({ from: todayStr(), to: offsetDateStr(27) });
  const [showAvailabilityBuilder, setShowAvailabilityBuilder] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isGeneratingSlots, setIsGeneratingSlots] = useState(false);
  const [isSavingCourt, setIsSavingCourt] = useState(false);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [showAddCourtModal, setShowAddCourtModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCourtAgendaModal, setShowCourtAgendaModal] = useState(false);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showDayOverrideModal, setShowDayOverrideModal] = useState(false);
  const [showCourtClosureModal, setShowCourtClosureModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAgendaCourt, setSelectedAgendaCourt] = useState(null);
  const [returnToCourtAgenda, setReturnToCourtAgenda] = useState(false);
  const [selectedClosureCourt, setSelectedClosureCourt] = useState(null);
  const [newCourtName, setNewCourtName] = useState('');
  const [newCourtType, setNewCourtType] = useState(COURT_TYPES[0]);
  const [bookingForm, setBookingForm] = useState({ occupant_name: '', occupant_phone: '', notes: '' });
  const [dayOverrideForm, setDayOverrideForm] = useState({ windows: [createWindow('08:00', '15:00')] });
  const [courtClosureForm, setCourtClosureForm] = useState({ start_date: todayStr(), end_date: todayStr(), reason: '' });
  const [courtClosures, setCourtClosures] = useState([]);
  const [venueForm, setVenueForm] = useState({ name: '', address: '', phone: '', image: '', price_per_slot: '' });
  const [venueImageFile, setVenueImageFile] = useState(null);
  const [planningForm, setPlanningForm] = useState({
    from: todayStr(),
    to: `${new Date().getFullYear()}-12-31`,
    court_ids: [],
    rules: [createRule([1, 2, 3]), createRule([4, 5], [createWindow('08:00', '15:00'), createWindow('17:00', '22:00')])],
  });
  const [clients] = useState([
    { id: 1, name: 'Ramiro Garcia', phone: '11 2233 4455', matches: 12 },
    { id: 2, name: 'Lucia Fernandez', phone: '11 5566 7788', matches: 8 },
  ]);
  const [isSavingClosure, setIsSavingClosure] = useState(false);
  const [isSavingVenue, setIsSavingVenue] = useState(false);
  const [isUploadingVenueImage, setIsUploadingVenueImage] = useState(false);

  function applyAvailabilityConfig(data) {
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
  }

  useEffect(() => {
    const incomingCourts = Array.isArray(venue?.Courts) ? venue.Courts : [];
    setCourts(incomingCourts);
    setPlanningForm((prev) => ({ ...prev, court_ids: incomingCourts.map((court) => court.id) }));
    setVenueForm({
      name: venue?.name || '',
      address: venue?.address || '',
      phone: venue?.phone || '',
      image: venue?.image || '',
      price_per_slot: venue?.price_per_slot ?? '',
    });
    setVenueImageFile(null);
  }, [venue]);

  useEffect(() => {
    if (venue?.id) {
      fetchAvailabilityRules();
    }
  }, [venue?.id]);

  useEffect(() => {
    if (!selectedAgendaDate) {
      setSelectedAgendaDate(todayStr());
    }
  }, [selectedAgendaDate]);

  useEffect(() => {
    if (!selectedAgendaDate) return;
    if (selectedAgendaDate < viewRange.from || selectedAgendaDate > viewRange.to) {
      setViewRange({
        from: shiftDateStr(selectedAgendaDate, -7),
        to: shiftDateStr(selectedAgendaDate, 21),
      });
    }
  }, [selectedAgendaDate, viewRange.from, viewRange.to]);

  useEffect(() => {
    if (activeTab !== 'planning' || !selectedAgendaDate || courts.length === 0) return;
    const hasDataForSelectedDate = slots.some((slot) => slot.date === selectedAgendaDate);
    const isOutsideLoadedRange = selectedAgendaDate < viewRange.from || selectedAgendaDate > viewRange.to;

    if (!hasDataForSelectedDate && !isOutsideLoadedRange) {
      setViewRange({
        from: shiftDateStr(selectedAgendaDate, -7),
        to: shiftDateStr(selectedAgendaDate, 21),
      });
    }
  }, [activeTab, courts.length, selectedAgendaDate, slots, viewRange.from, viewRange.to]);

  useEffect(() => {
    if (['planning', 'overview', 'courts'].includes(activeTab)) fetchSlots();
  }, [activeTab, venue?.id, viewRange.from, viewRange.to]);

  async function fetchSlots() {
    setIsLoadingSlots(true);
    try {
      const response = await axios.get('/api/partners/slots', { params: { from: viewRange.from, to: viewRange.to } });
      setSlots(response.data.slots || []);
      await Promise.all([fetchExceptions(), fetchClosures()]);
    } catch (err) {
      console.error(err);
      setSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }

  async function fetchAvailabilityRules() {
    try {
      const response = await axios.get('/api/partners/availability-rules');
      applyAvailabilityConfig(response.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchExceptions() {
    try {
      const response = await axios.get('/api/partners/availability-exceptions', { params: { from: viewRange.from, to: viewRange.to } });
      setExceptions(response.data.exceptions || []);
    } catch (err) {
      console.error(err);
      setExceptions([]);
    }
  }

  async function fetchClosures() {
    try {
      const response = await axios.get('/api/partners/court-closures', {
        params: {
          from: viewRange.from < todayStr() ? viewRange.from : todayStr(),
          to: planningForm.to > viewRange.to ? planningForm.to : viewRange.to,
        }
      });
      setCourtClosures(response.data.closures || []);
    } catch (err) {
      console.error(err);
      setCourtClosures([]);
    }
  }

  const slotsByCourt = useMemo(() => courts.map((court) => ({
    ...court,
    slots: slots.filter((slot) => slot.Court?.id === court.id),
  })), [courts, slots]);

  const selectedDaySummary = useMemo(() => {
    const daySlots = slots.filter((slot) => slot.date === selectedAgendaDate);
    return {
      date: selectedAgendaDate,
      free: daySlots.filter((slot) => slot.is_available).length,
      occupied: daySlots.filter((slot) => !slot.is_available).length,
      total: daySlots.length,
    };
  }, [selectedAgendaDate, slots]);
  const hasSlotsForSelectedDate = useMemo(
    () => slots.some((slot) => slot.date === selectedAgendaDate),
    [selectedAgendaDate, slots]
  );
  const isSelectedDateHydrating = isLoadingSlots && !hasSlotsForSelectedDate;

  const isTodaySelected = selectedAgendaDate === todayStr();
  const exceptionMap = useMemo(
    () => Object.fromEntries(exceptions.map((item) => [item.date, item])),
    [exceptions]
  );

  const closuresByCourt = useMemo(
    () => courts.reduce((acc, court) => {
      acc[court.id] = courtClosures
        .filter((closure) => closure.court_id === court.id)
        .sort((a, b) => `${a.start_date}${a.end_date}`.localeCompare(`${b.start_date}${b.end_date}`));
      return acc;
    }, {}),
    [courtClosures, courts]
  );

  const selectedDayOverride = exceptionMap[selectedAgendaDate] || null;

  const agendaByCourt = useMemo(() => courts.map((court) => {
    const allSlots = slots
      .filter((slot) => slot.date === selectedAgendaDate && slot.Court?.id === court.id)
      .sort((a, b) => a.time.localeCompare(b.time));
    const visibleSlots = allSlots.filter((slot) => agendaFilter === 'all' ? true : agendaFilter === 'free' ? slot.is_available : !slot.is_available);
    const activeClosure = (closuresByCourt[court.id] || []).find((closure) => closure.start_date <= selectedAgendaDate && closure.end_date >= selectedAgendaDate) || null;
    return {
      ...court,
      allSlots,
      slots: visibleSlots,
      freeCount: allSlots.filter((slot) => slot.is_available).length,
      occupiedCount: allSlots.filter((slot) => !slot.is_available).length,
      activeClosure,
    };
  }), [courts, selectedAgendaDate, slots, agendaFilter, closuresByCourt]);

  const summary = useMemo(() => {
    const today = todayStr();
    const todaySlots = slots.filter((slot) => slot.date === today);
    const configuredCourts = slotsByCourt.filter((court) => court.slots.length > 0).length;
    const nextAvailable = [...slots].filter((slot) => slot.is_available).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))[0];
    return {
      freeToday: todaySlots.filter((slot) => slot.is_available).length,
      occupiedToday: todaySlots.filter((slot) => !slot.is_available).length,
      configuredCourts,
      unconfiguredCourts: Math.max(0, courts.length - configuredCourts),
      nextAvailable,
    };
  }, [courts.length, slots, slotsByCourt]);

  function toggleCourt(courtId) {
    setPlanningForm((prev) => ({
      ...prev,
      court_ids: prev.court_ids.includes(courtId) ? prev.court_ids.filter((id) => id !== courtId) : [...prev.court_ids, courtId],
    }));
  }

  function openCourtAgenda(court) {
    setSelectedAgendaCourt(court);
    setShowCourtAgendaModal(true);
  }

  function toggleRuleWeekday(ruleId, weekday) {
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
  }

  function addRule() {
    setPlanningForm((prev) => ({
      ...prev,
      rules: [...prev.rules, createRule([], [createWindow('08:00', '09:30')])],
    }));
  }

  function removeRule(ruleId) {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.length === 1 ? prev.rules : prev.rules.filter((rule) => rule.id !== ruleId),
    }));
  }

  function addTimeWindow(ruleId) {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => rule.id === ruleId
        ? { ...rule, windows: [...rule.windows, createWindow('08:00', '09:30')] }
        : rule),
    }));
  }

  function updateTimeWindow(ruleId, windowId, field, value) {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => rule.id === ruleId
        ? { ...rule, windows: rule.windows.map((window) => window.id === windowId ? { ...window, [field]: value } : window) }
        : rule),
    }));
  }

  function removeTimeWindow(ruleId, windowId) {
    setPlanningForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule) => {
        if (rule.id !== ruleId) return rule;
        return { ...rule, windows: rule.windows.length === 1 ? rule.windows : rule.windows.filter((window) => window.id !== windowId) };
      }),
    }));
  }

  function openDayOverride() {
    const firstCourtWithAgenda = agendaByCourt.find((court) => court.allSlots.length > 0);
    setDayOverrideForm({
      windows: selectedDayOverride?.windows?.length
        ? selectedDayOverride.windows.map((window) => createWindow(window.start_time, window.end_time))
        : firstCourtWithAgenda
          ? slotsToWindows(firstCourtWithAgenda.allSlots)
          : [createWindow('08:00', '15:00')],
    });
    setShowDayOverrideModal(true);
  }

  function addDayOverrideWindow() {
    setDayOverrideForm((prev) => ({ ...prev, windows: [...prev.windows, createWindow('08:00', '09:30')] }));
  }

  function updateDayOverrideWindow(windowId, field, value) {
    setDayOverrideForm((prev) => ({
      ...prev,
      windows: prev.windows.map((window) => window.id === windowId ? { ...window, [field]: value } : window),
    }));
  }

  function removeDayOverrideWindow(windowId) {
    setDayOverrideForm((prev) => ({
      ...prev,
      windows: prev.windows.length === 1 ? prev.windows : prev.windows.filter((window) => window.id !== windowId),
    }));
  }

  async function saveDayOverride() {
    setIsGeneratingSlots(true);
    try {
      await axios.put('/api/partners/availability-exceptions', {
        date: selectedAgendaDate,
        windows: dayOverrideForm.windows.map((window) => ({
          start_time: window.start_time,
          end_time: window.end_time,
        })),
      });
      await fetchSlots();
      setShowDayOverrideModal(false);
    } catch (err) {
      alert(`Error guardando disponibilidad del dia: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingSlots(false);
    }
  }

  function openCourtClosure(court) {
    setSelectedClosureCourt(court);
    const activeOrLatestClosure = (closuresByCourt[court.id] || []).find((closure) => closure.end_date >= todayStr()) || null;
    setCourtClosureForm({
      start_date: activeOrLatestClosure?.start_date || selectedAgendaDate || todayStr(),
      end_date: activeOrLatestClosure?.end_date || selectedAgendaDate || todayStr(),
      reason: activeOrLatestClosure?.reason || '',
    });
    setShowCourtClosureModal(true);
  }

  async function saveCourtClosure() {
    if (!selectedClosureCourt?.id) return;
    setIsSavingClosure(true);
    try {
      await axios.post('/api/partners/court-closures', {
        court_id: selectedClosureCourt.id,
        start_date: courtClosureForm.start_date,
        end_date: courtClosureForm.end_date,
        reason: courtClosureForm.reason,
      });
      await fetchSlots();
      setShowCourtClosureModal(false);
    } catch (err) {
      alert(`Error guardando clausura: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingClosure(false);
    }
  }

  async function removeCourtClosure(closureId) {
    setIsSavingClosure(true);
    try {
      await axios.delete(`/api/partners/court-closures/${closureId}`);
      await fetchSlots();
      setShowCourtClosureModal(false);
    } catch (err) {
      alert(`Error eliminando clausura: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingClosure(false);
    }
  }

  async function handleGenerateSlots() {
    if (planningForm.court_ids.length === 0) return alert('Selecciona al menos una cancha.');
    const validRules = planningForm.rules.filter((rule) => rule.weekdays.length > 0 && rule.windows.length > 0);
    if (validRules.length === 0) return alert('Define al menos una regla semanal con dias y horarios.');
    setIsGeneratingSlots(true);
    try {
      await axios.put('/api/partners/availability-rules', {
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
      setViewRange({ from: planningForm.from, to: planningForm.to });
      await fetchSlots();
      await fetchAvailabilityRules();
      alert('Disponibilidad guardada.');
      setShowAvailabilityBuilder(false);
    } catch (err) {
      alert(`Error guardando disponibilidad: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsGeneratingSlots(false);
    }
  }

  async function handleAddCourt() {
    const name = newCourtName.trim();
    if (!name) return;
    setIsSavingCourt(true);
    try {
      await axios.post('/api/partners/courts', { name, type: newCourtType });
      if (onVenueRefresh) await onVenueRefresh();
      setShowAddCourtModal(false);
      setNewCourtName('');
      setNewCourtType(COURT_TYPES[0]);
    } catch (err) {
      alert(`Error al guardar la cancha: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingCourt(false);
    }
  }

  async function handleSaveVenue() {
    if (!venueForm.name.trim()) return alert('Ingresa el nombre de la sede.');
    setIsSavingVenue(true);
    try {
      await axios.put('/api/partners/venue', {
        name: venueForm.name,
        address: venueForm.address,
        phone: venueForm.phone,
        image: venueForm.image,
        price_per_slot: venueForm.price_per_slot === '' ? 0 : Number(venueForm.price_per_slot),
      });
      if (onVenueRefresh) await onVenueRefresh();
    } catch (err) {
      alert(`Error guardando la sede: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingVenue(false);
    }
  }

  async function handleVenueImageSelected(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setIsUploadingVenueImage(true);
    try {
      const response = await axios.post('/api/partners/venue/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVenueForm((prev) => ({ ...prev, image: response.data.image || prev.image }));
      setVenueImageFile(file);
      if (onVenueRefresh) await onVenueRefresh();
    } catch (err) {
      alert(`Error subiendo imagen: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsUploadingVenueImage(false);
    }
  }

  function openBooking(slot) {
    setReturnToCourtAgenda(true);
    setShowCourtAgendaModal(false);
    setSelectedSlot(slot);
    setBookingForm({ occupant_name: '', occupant_phone: '', notes: '' });
    setShowBookingModal(true);
  }

  function closeBookingModal() {
    setShowBookingModal(false);
    if (returnToCourtAgenda && selectedAgendaCourt) {
      setShowCourtAgendaModal(true);
    }
  }

  async function handleOccupySlot() {
    if (!selectedSlot?.id) return;
    if (!bookingForm.occupant_name.trim()) return alert('Ingresa el nombre del cliente.');
    setIsSavingBooking(true);
    try {
      await axios.put(`/api/partners/slots/${selectedSlot.id}/occupy`, bookingForm);
      await fetchSlots();
      setShowBookingModal(false);
      setReturnToCourtAgenda(false);
    } catch (err) {
      alert(`Error ocupando turno: ${err.response?.data?.error || err.message}`);
    } finally {
      setIsSavingBooking(false);
    }
  }

  return (
    <div className="layout">
      <aside className="sidebar glass">
        <div className="brand">
          <span className="dot"></span>
          <span className="brandLabel">PADEX <strong>PARTNER</strong></span>
        </div>
        <div className="venueRailMeta">
          <strong>{venue?.name || 'Tu sede'}</strong>
          <span>{venue?.address || 'Sin direccion cargada'}</span>
        </div>
        <nav className="menu">
          <button title="Resumen" className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><LayoutDashboard size={18} /><span className="navLabel">Resumen</span></button>
          <button title="Agenda" className={activeTab === 'planning' ? 'active' : ''} onClick={() => setActiveTab('planning')}><Calendar size={18} /><span className="navLabel">Agenda</span></button>
          <button title="Sede" className={activeTab === 'venue' ? 'active' : ''} onClick={() => setActiveTab('venue')}><Settings size={18} /><span className="navLabel">Sede</span></button>
          <button title="Canchas" className={activeTab === 'courts' ? 'active' : ''} onClick={() => setActiveTab('courts')}><Building2 size={18} /><span className="navLabel">Canchas</span></button>
          <button title="Clientes" className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}><Users size={18} /><span className="navLabel">Clientes</span></button>
        </nav>
        <div className="sidebarFooter">
          <button title="Cerrar sesion" onClick={onLogout}><LogOut size={18} /><span className="navLabel">Cerrar sesion</span></button>
        </div>
      </aside>

      <main className="main">
        {activeTab === 'overview' && (
          <div className="stack">
            <section className="hero glass">
              <div>
                <p className="eyebrow">Resumen</p>
                <h2>Lectura operativa de la sede</h2>
                <p className="subtle">Lo importante primero: turnos libres, ocupados y canchas que todavia no tienen agenda.</p>
              </div>
            </section>
            <section className="stats">
              <article className="stat glass"><span>Libres hoy</span><strong>{summary.freeToday}</strong><small>Turnos disponibles hoy</small></article>
              <article className="stat glass"><span>Ocupados hoy</span><strong>{summary.occupiedToday}</strong><small>Reservas y bloqueos del dia</small></article>
              <article className="stat glass"><span>Canchas con agenda</span><strong>{summary.configuredCourts}/{courts.length}</strong><small>{summary.unconfiguredCourts ? `${summary.unconfiguredCourts} sin configurar` : 'Todas activas'}</small></article>
              <article className="stat glass accent"><span>Proximo libre</span><strong>{summary.nextAvailable ? summary.nextAvailable.time : '--:--'}</strong><small>{summary.nextAvailable ? `${summary.nextAvailable.Court?.name} - ${formatDateLabel(summary.nextAvailable.date)}` : 'Sin turnos disponibles'}</small></article>
            </section>
          </div>
        )}

        {activeTab === 'planning' && (
          <div className="stack">
            <section className="agendaShell">
              <div className="agendaMain glass">
                <div className="agendaHeader">
                  <div>
                    <p className="eyebrow">Agenda diaria</p>
                    <h3>{selectedAgendaDate ? formatDateLabel(selectedAgendaDate, true) : 'Sin agenda cargada'}</h3>
                    <p className="subtle">
                      {isSelectedDateHydrating
                        ? 'Actualizando disponibilidad del dia...'
                        : `${selectedDaySummary.total} turnos - ${selectedDaySummary.free} libres - ${selectedDaySummary.occupied} ocupados`}
                    </p>
                  </div>
                  <div className="agendaHeaderRight">
                    <div className="todayBadges">
                      <span className="miniBadge neutral">{summary.freeToday + summary.occupiedToday} hoy</span>
                      <span className="miniBadge free">{summary.freeToday} libres</span>
                      <span className="miniBadge busy">{summary.occupiedToday} ocupados</span>
                    </div>
                    <div className="agendaActions">
                      <button className="btn-secondary compact" onClick={fetchSlots} disabled={isLoadingSlots}>{isLoadingSlots ? 'Actualizando...' : 'Actualizar'}</button>
                      <button className="btn-primary-sm compact" onClick={() => setShowAvailabilityBuilder(true)}><Plus size={16} />Configurar</button>
                    </div>
                  </div>
                </div>

                <div className={`dayNavigator ${isTodaySelected ? 'today' : 'otherDay'}`}>
                  <div className="dayNavigatorMain">
                    <div className="dayStepper">
                      <button type="button" className="navDayBtn" onClick={() => setSelectedAgendaDate((prev) => shiftDateStr(prev || todayStr(), -1))}>
                        Anterior
                      </button>
                      <div className="currentDayBlock">
                        <span>{isTodaySelected ? 'Hoy' : 'Otro dia'}</span>
                        <strong>{selectedAgendaDate ? formatDateLabel(selectedAgendaDate, true) : 'Selecciona una fecha'}</strong>
                      </div>
                      <button type="button" className="navDayBtn" onClick={() => setSelectedAgendaDate((prev) => shiftDateStr(prev || todayStr(), 1))}>
                        Siguiente
                      </button>
                    </div>
                  </div>
                  <div className="dayNavigatorMeta">
                    <button type="button" className="btn-outline compact" onClick={openDayOverride}>
                      Modificar disponibilidad del dia
                    </button>
                    <button type="button" className={`todayShortcut ${isTodaySelected ? 'active' : ''}`} onClick={() => setSelectedAgendaDate(todayStr())}>
                      Ir a hoy
                    </button>
                    <label>
                      <span>Elegir fecha</span>
                      <input type="date" value={selectedAgendaDate} onChange={(e) => setSelectedAgendaDate(e.target.value)} />
                    </label>
                  </div>
                </div>

                <div className="agendaToolbar">
                  <div className="toolbarGroup">
                    <div className="segmented">
                      <button className={agendaFilter === 'all' ? 'active' : ''} onClick={() => setAgendaFilter('all')}>Todos</button>
                      <button className={agendaFilter === 'free' ? 'active' : ''} onClick={() => setAgendaFilter('free')}>Libres</button>
                      <button className={agendaFilter === 'occupied' ? 'active' : ''} onClick={() => setAgendaFilter('occupied')}>Ocupados</button>
                    </div>
                    {selectedDayOverride && <span className="miniBadge dayOverride">Dia ajustado manualmente</span>}
                  </div>
                  <button className="btn-secondary" onClick={fetchSlots} disabled={isLoadingSlots}>{isLoadingSlots ? 'Actualizando...' : 'Actualizar agenda'}</button>
                </div>

                <div className="courtAgendaList">
                  {isSelectedDateHydrating ? (
                    <div className="emptyLane"><span>Actualizando disponibilidad para {selectedAgendaDate ? formatDateLabel(selectedAgendaDate, true) : 'el dia seleccionado'}...</span></div>
                  ) : agendaByCourt.map((court) => (
                    <section key={court.id} className="courtLane collapsed">
                      <button type="button" className="courtLaneHeader clickable" onClick={() => openCourtAgenda(court)}>
                        <div>
                          <h4>{court.name}</h4>
                          <p>{court.type || 'Sin tipo cargado'}</p>
                        </div>
                        <div className="laneStats">
                          <span className="miniBadge neutral">{court.allSlots.length} turnos</span>
                          <span className="miniBadge free">{court.freeCount} libres</span>
                          <span className="miniBadge busy">{court.occupiedCount} ocupados</span>
                          {court.activeClosure && <span className="miniBadge closed">Clausurada</span>}
                          <span className="collapseIcon"><ChevronDown size={16} /></span>
                        </div>
                      </button>
                      <div className="collapsedHint">Click para ver y gestionar los turnos del dia.</div>
                    </section>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'courts' && (
          <div className="stack">
            <section className="hero glass">
              <div>
                <p className="eyebrow">Canchas</p>
                <h2>Infraestructura</h2>
                <p className="subtle">Cada cancha necesita nombre claro y tipo para que la agenda sea facil de entender.</p>
              </div>
              <button className="btn-primary-sm" onClick={() => setShowAddCourtModal(true)}><Plus size={16} />Agregar cancha</button>
            </section>
            <section className="courtCards">
              {slotsByCourt.map((court) => {
                const freeCount = court.slots.filter((slot) => slot.is_available).length;
                const currentClosure = (closuresByCourt[court.id] || []).find((closure) => closure.end_date >= todayStr()) || null;
                return (
                  <article key={court.id} className="courtCard glass">
                    <div className="iconBox"><Building2 size={28} /></div>
                    <div className="cardBody">
                      <h3>{court.name}</h3>
                      <p>Tipo: {court.type || 'Sin tipo'} - turnos de 1.5 hs</p>
                      <div className="meta">
                        <span>{court.slots.length} turnos</span>
                        <span>{freeCount} libres</span>
                        {currentClosure ? <span className="metaAlert">Clausurada hasta {formatDateLabel(currentClosure.end_date)}</span> : <span className="metaOk">Operativa</span>}
                      </div>
                      {currentClosure && <p className="closureInfo">Desde {formatDateLabel(currentClosure.start_date)} hasta {formatDateLabel(currentClosure.end_date)}{currentClosure.reason ? ` · ${currentClosure.reason}` : ''}</p>}
                      <div className="cardActions">
                        <button type="button" className="btn-outline compact" onClick={() => openCourtClosure(court)}>
                          {currentClosure ? 'Editar clausura' : 'Clausurar cancha'}
                        </button>
                        {currentClosure && (
                          <button type="button" className="btn-secondary compact dangerGhost" onClick={() => removeCourtClosure(currentClosure.id)} disabled={isSavingClosure}>
                            Quitar clausura
                          </button>
                        )}
                      </div>
                    </div>
                    <button className="icon-btn danger" onClick={() => setCourts(courts.filter((c) => c.id !== court.id))}><Trash2 size={18} /></button>
                  </article>
                );
              })}
            </section>
          </div>
        )}

        {activeTab === 'venue' && (
          <div className="stack">
            <section className="hero glass compactHero">
              <div>
                <p className="eyebrow">Sede</p>
                <h2>Datos del club</h2>
                <p className="subtle">Aqui el manager puede mantener nombre, direccion, telefono, imagen y precio general de los turnos de la sede.</p>
              </div>
            </section>
            <section className="venueEditor glass">
              <div className="venuePreview">
                <div className="venueImageFrame">
                  {venueForm.image ? <img src={venueForm.image} alt={venueForm.name || 'Sede'} /> : <div className="venueImagePlaceholder"><ImageIcon size={28} /></div>}
                </div>
                <label className="uploadButton">
                  <input type="file" accept="image/*" onChange={(e) => handleVenueImageSelected(e.target.files?.[0])} />
                  {isUploadingVenueImage ? 'Subiendo imagen...' : 'Subir imagen desde archivo'}
                </label>
                <div className="venuePreviewText">
                  <h3>{venueForm.name || 'Nombre de sede'}</h3>
                  <p><MapPin size={16} />{venueForm.address || 'Sin direccion cargada'}</p>
                  <p><Phone size={16} />{venueForm.phone || 'Sin telefono cargado'}</p>
                  <p><DollarSign size={16} />${Number(venueForm.price_per_slot || 0).toLocaleString('es-AR')} por turno</p>
                </div>
              </div>
              <div className="venueFormGrid">
                <label><span>Nombre comercial</span><input type="text" value={venueForm.name} onChange={(e) => setVenueForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ej: Padex Centro" /></label>
                <label><span>Telefono</span><input type="text" value={venueForm.phone} onChange={(e) => setVenueForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+54 9 ..." /></label>
                <label className="wideField"><span>Direccion</span><input type="text" value={venueForm.address} onChange={(e) => setVenueForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Ej: Santa Fe 435" /></label>
                <label><span>Precio general por turno</span><input type="number" min="0" step="100" value={venueForm.price_per_slot} onChange={(e) => setVenueForm((prev) => ({ ...prev, price_per_slot: e.target.value }))} placeholder="Ej: 12000" /></label>
                <label className="wideField"><span>Imagen actual</span><input type="text" value={venueForm.image} onChange={(e) => setVenueForm((prev) => ({ ...prev, image: e.target.value }))} placeholder="/uploads/..." /></label>
              </div>
              <div className="venueActions">
                <button className="btn-secondary" onClick={() => setVenueForm({
                  name: venue?.name || '',
                  address: venue?.address || '',
                  phone: venue?.phone || '',
                  image: venue?.image || '',
                  price_per_slot: venue?.price_per_slot ?? '',
                })} disabled={isSavingVenue}>Restablecer</button>
                <button className="btn-primary-sm" onClick={handleSaveVenue} disabled={isSavingVenue}>{isSavingVenue ? 'Guardando...' : 'Guardar sede'}</button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="stack">
            <section className="hero glass">
              <div>
                <p className="eyebrow">Clientes</p>
                <h2>Base de clientes</h2>
                <p className="subtle">Una vista liviana para reservas manuales y clientes frecuentes.</p>
              </div>
              <button className="btn-primary-sm" onClick={() => setShowAddClientModal(true)}><Plus size={16} />Nuevo cliente</button>
            </section>
            <div className="clientsTable glass">
              <table className="admin-table">
                <thead><tr><th>Nombre</th><th>Telefono</th><th>Partidos jugados</th><th>Acciones</th></tr></thead>
                <tbody>
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td>{client.name}</td>
                      <td>{client.phone}</td>
                      <td>{client.matches}</td>
                      <td><button className="icon-btn"><Mail size={16} /></button><button className="icon-btn danger"><Trash2 size={16} /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {showAddCourtModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal glass">
              <h3>Nueva cancha</h3>
              <p className="subtle">Define un nombre de referencia y el material principal.</p>
              <label><span>Nombre de referencia</span><input type="text" value={newCourtName} onChange={(e) => setNewCourtName(e.target.value)} placeholder="Ej: Cancha Central, Vidrio 1, Norte" autoFocus /></label>
              <label><span>Material / tipo</span><select value={newCourtType} onChange={(e) => setNewCourtType(e.target.value)}>{COURT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
              <div className="modalActions">
                <button className="btn-secondary" onClick={() => setShowAddCourtModal(false)} disabled={isSavingCourt}>Cancelar</button>
                <button className="btn-primary-sm" onClick={handleAddCourt} disabled={!newCourtName.trim() || isSavingCourt}>{isSavingCourt ? 'Guardando...' : 'Guardar cancha'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {showAddClientModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} className="modal glass">
              <h3>Registrar cliente</h3>
              <p className="subtle">Agrega un jugador a tu base para reservas rapidas.</p>
              <label><span>Nombre completo</span><input type="text" placeholder="Ej: Juan Perez" /></label>
              <label><span>Telefono</span><input type="text" placeholder="+54 9 ..." /></label>
              <div className="modalActions">
                <button className="btn-secondary" onClick={() => setShowAddClientModal(false)}>Cancelar</button>
                <button className="btn-primary-sm" onClick={() => setShowAddClientModal(false)}>Guardar</button>
              </div>
            </motion.div>
          </div>
        )}

        {showBookingModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal glass">
              <p className="eyebrow">Reserva manual</p>
              <h3>Confirmar turno</h3>
              <p className="subtle">Vas a ocupar {selectedSlot?.Court?.name || 'la cancha'} el {selectedSlot ? formatDateLabel(selectedSlot.date, true) : ''} a las {selectedSlot?.time}. Completa los datos del cliente para bloquear este horario.</p>
              <div className="bookingContext">
                <span className="contextPill">{selectedSlot?.Court?.name || 'Cancha'}</span>
                <span className="contextPill">{selectedSlot ? formatDateLabel(selectedSlot.date, true) : 'Fecha'}</span>
                <span className="contextPill strong">{selectedSlot?.time || '--:--'}</span>
              </div>
              <label><span>Nombre del cliente</span><input type="text" value={bookingForm.occupant_name} onChange={(e) => setBookingForm((prev) => ({ ...prev, occupant_name: e.target.value }))} placeholder="Ej: Carlos Paez" /></label>
              <label><span>Telefono</span><input type="text" value={bookingForm.occupant_phone} onChange={(e) => setBookingForm((prev) => ({ ...prev, occupant_phone: e.target.value }))} placeholder="+54 9 ..." /></label>
              <label><span>Notas</span><textarea value={bookingForm.notes} onChange={(e) => setBookingForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Pagado por adelantado..."></textarea></label>
              <div className="modalActions">
                <button className="btn-secondary" onClick={closeBookingModal} disabled={isSavingBooking}>Cancelar</button>
                <button className="btn-primary-sm" onClick={handleOccupySlot} disabled={isSavingBooking}>{isSavingBooking ? 'Guardando...' : 'Ocupar turno'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {showCourtAgendaModal && selectedAgendaCourt && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal glass availabilityModal courtAgendaModal">
              <div className="modalHeader">
                <div>
                  <p className="eyebrow">Agenda de cancha</p>
                  <h3>{selectedAgendaCourt.name} · {selectedAgendaDate ? formatDateLabel(selectedAgendaDate, true) : ''}</h3>
                  <p className="subtle">{selectedAgendaCourt.type || 'Sin tipo'} · {selectedAgendaCourt.allSlots.length} turnos · {selectedAgendaCourt.freeCount} libres · {selectedAgendaCourt.occupiedCount} ocupados</p>
                </div>
                <button className="btn-secondary compact closeModalBtn" onClick={() => setShowCourtAgendaModal(false)}>Cerrar</button>
              </div>

              <div className="courtAgendaBody">
                {selectedAgendaCourt.activeClosure && selectedAgendaCourt.allSlots.length === 0 ? (
                  <div className="emptyLane"><span>Cancha clausurada entre {formatDateLabel(selectedAgendaCourt.activeClosure.start_date)} y {formatDateLabel(selectedAgendaCourt.activeClosure.end_date)}.</span></div>
                ) : selectedAgendaCourt.allSlots.length === 0 ? (
                  <div className="emptyLane"><span>Esta cancha no tiene agenda para este dia.</span></div>
                ) : selectedAgendaCourt.slots.length === 0 ? (
                  <div className="emptyLane"><span>No hay turnos para el filtro actual.</span></div>
                ) : (
                  <div className="slotRow modalSlotRow">
                    {selectedAgendaCourt.slots.map((slot) => {
                      const status = getSlotStatus(slot);
                      return (
                        <motion.button whileHover={{ scale: slot.is_available ? 1.02 : 1 }} whileTap={{ scale: slot.is_available ? 0.98 : 1 }} key={slot.id} type="button" className={`slotCard ${status.key}`} onClick={() => slot.is_available && openBooking(slot)}>
                          <div className="slotTop">
                            <span className={`statusPill ${status.key}`}>{status.label}</span>
                            <span className="slotTime"><Clock3 size={13} />{slot.time}</span>
                          </div>
                          <strong>{status.detail}</strong>
                          <small>{slot.is_available ? 'Click para reservar manualmente' : slot.occupant_phone || 'Turno ya tomado'}</small>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="modalActions">
                <button className="btn-secondary closeFooterBtn" onClick={() => setShowCourtAgendaModal(false)}>Cerrar agenda</button>
              </div>
            </motion.div>
          </div>
        )}

        {showDayOverrideModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal glass availabilityModal">
              <div className="modalHeader">
                <div>
                  <p className="eyebrow">Disponibilidad del dia</p>
                  <h3>{selectedAgendaDate ? formatDateLabel(selectedAgendaDate, true) : ''}</h3>
                  <p className="subtle">Esto pisa la regla semanal solo para esta fecha y aplica a todas las canchas de la sede.</p>
                </div>
                <button className="icon-btn" onClick={() => setShowDayOverrideModal(false)}>x</button>
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
                <button className="btn-secondary" onClick={() => setShowDayOverrideModal(false)} disabled={isGeneratingSlots}>Cancelar</button>
                <button className="btn-outline" onClick={saveDayOverride} disabled={isGeneratingSlots}>{isGeneratingSlots ? 'Guardando...' : 'Guardar disponibilidad del dia'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {showCourtClosureModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal glass">
              <h3>Clausurar cancha</h3>
              <p className="subtle">Define por cuanto tiempo quedara fuera de servicio {selectedClosureCourt?.name || 'esta cancha'}.</p>
              <div className="twoCols">
                <label><span>Desde</span><input type="date" value={courtClosureForm.start_date} onChange={(e) => setCourtClosureForm((prev) => ({ ...prev, start_date: e.target.value }))} /></label>
                <label><span>Hasta</span><input type="date" value={courtClosureForm.end_date} onChange={(e) => setCourtClosureForm((prev) => ({ ...prev, end_date: e.target.value }))} /></label>
              </div>
              <label><span>Motivo</span><input type="text" value={courtClosureForm.reason} onChange={(e) => setCourtClosureForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Ej: mantenimiento, torneo, reparacion" /></label>
              <div className="modalActions">
                <button className="btn-secondary" onClick={() => setShowCourtClosureModal(false)} disabled={isSavingClosure}>Cancelar</button>
                <button className="btn-primary-sm" onClick={saveCourtClosure} disabled={isSavingClosure}>{isSavingClosure ? 'Guardando...' : 'Guardar clausura'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {showAvailabilityBuilder && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal glass availabilityModal">
              <div className="modalHeader">
                <div>
                  <p className="eyebrow">Disponibilidad semanal</p>
                  <h3>Guardar reglas semanales</h3>
                  <p className="subtle">Cada regla agrupa dias que comparten los mismos horarios. Asi puedes marcar lunes, martes y miercoles juntos con el mismo patron.</p>
                </div>
                <button className="icon-btn" onClick={() => setShowAvailabilityBuilder(false)}>✕</button>
              </div>
              <div className="twoCols">
                <label><span>Desde</span><input type="date" value={planningForm.from} onChange={(e) => setPlanningForm((prev) => ({ ...prev, from: e.target.value }))} /></label>
                <label><span>Hasta</span><input type="date" value={planningForm.to} onChange={(e) => setPlanningForm((prev) => ({ ...prev, to: e.target.value }))} /></label>
              </div>
              <label>
                <span>Canchas incluidas</span>
                <div className="chipWrap">
                  {courts.map((court) => <button key={court.id} type="button" className={`chip ${planningForm.court_ids.includes(court.id) ? 'active' : ''}`} onClick={() => toggleCourt(court.id)}>{court.name}</button>)}
                </div>
              </label>
              <div className="ruleList">
                {planningForm.rules.map((rule, index) => (
                  <section key={rule.id} className="ruleCard">
                    <div className="ruleHeader">
                      <div>
                        <strong>Regla {index + 1}</strong>
                        <small>Dias con el mismo esquema horario</small>
                      </div>
                      <button type="button" className="icon-btn danger" onClick={() => removeRule(rule.id)} disabled={planningForm.rules.length === 1}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <label>
                      <span>Dias</span>
                      <div className="chipWrap">
                        {WEEKDAYS.map((day) => <button key={day.value} type="button" className={`chip ${rule.weekdays.includes(day.value) ? 'active' : ''}`} onClick={() => toggleRuleWeekday(rule.id, day.value)} title={day.label}>{day.short}</button>)}
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
              <div className="note">El sistema proyecta estas reglas sobre todo el periodo elegido. Asi puedes dejar un patron estable para todo el ano operativo.</div>
              <div className="modalActions">
                <button className="btn-secondary" onClick={() => setShowAvailabilityBuilder(false)} disabled={isGeneratingSlots}>Cancelar</button>
                <button className="btn-outline" onClick={handleGenerateSlots} disabled={isGeneratingSlots}>{isGeneratingSlots ? 'Guardando...' : 'Guardar disponibilidad'}</button>
              </div>
            </motion.div>
          </div>
        )}

        <style dangerouslySetInnerHTML={{ __html: `
          .layout{display:block;min-height:100vh}
          .sidebar{width:104px;padding:24px 18px;display:flex;flex-direction:column;border-right:1px solid var(--border);background:radial-gradient(circle at top,rgba(192,255,0,.08),transparent 28%),linear-gradient(180deg,rgba(18,18,20,.72),rgba(10,10,12,.98));overflow:hidden;transition:width .24s ease,padding .24s ease,box-shadow .24s ease;position:fixed;top:0;left:0;height:100vh;z-index:40}
          .sidebar:hover{width:264px;padding-inline:18px;box-shadow:24px 0 48px rgba(0,0,0,.42)}
          .brand{display:flex;align-items:center;justify-content:center;gap:12px;min-height:44px;margin-bottom:28px;font-size:.9rem;letter-spacing:.05em;white-space:nowrap}.dot{width:16px;height:16px;border-radius:50%;background:var(--primary);box-shadow:0 0 20px rgba(192,255,0,.25);flex:0 0 auto}
          .brandLabel,.navLabel,.venueRailMeta{opacity:0;transform:translateX(-6px);transition:opacity .18s ease,transform .18s ease;pointer-events:none;white-space:nowrap;width:0;overflow:hidden}
          .sidebar:hover .brandLabel,.sidebar:hover .navLabel,.sidebar:hover .venueRailMeta{opacity:1;transform:translateX(0);pointer-events:auto;width:auto}
          .sidebar:hover .brand{justify-content:flex-start}
          .venueRailMeta{display:flex;flex-direction:column;gap:4px;margin:-8px 0 18px 0;white-space:normal}
          .venueRailMeta strong{font-size:.98rem;letter-spacing:-.02em;font-weight:800;color:#f5f7fb}
          .venueRailMeta span{font-size:.84rem;line-height:1.4;color:var(--muted-foreground)}
          .menu{display:flex;flex-direction:column;gap:8px;flex:1}.menu button,.sidebarFooter button{display:flex;align-items:center;gap:12px;padding:13px 14px;border-radius:14px;background:transparent;color:var(--muted-foreground);font-size:.96rem;font-weight:700;min-height:48px;justify-content:center;width:100%}
          .menu button svg,.sidebarFooter button svg{flex:0 0 auto}
          .sidebar:hover .menu button,.sidebar:hover .sidebarFooter button{justify-content:flex-start}
          .sidebar:not(:hover) .menu button,.sidebar:not(:hover) .sidebarFooter button{padding-inline:0;gap:0}
          .sidebar:not(:hover) .menu button svg,.sidebar:not(:hover) .sidebarFooter button svg{margin:0 auto}
          .menu button.active{background:rgba(192,255,0,.12);color:var(--primary);box-shadow:inset 0 0 0 1px rgba(192,255,0,.14)}.menu button:hover:not(.active),.sidebarFooter button:hover{background:rgba(255,255,255,.03);color:#fff}
          .sidebarFooter{display:flex;flex-direction:column;gap:8px}.main{min-width:0;margin-left:104px;padding:24px 32px 40px}
          .eyebrow{color:var(--primary);font-size:.74rem;text-transform:uppercase;letter-spacing:.13em;margin-bottom:10px;font-weight:800}.subtle{color:var(--muted-foreground);line-height:1.6}
          h1{font-size:2.35rem;font-weight:800;letter-spacing:-.04em;margin-bottom:8px}h2{font-size:1.95rem;letter-spacing:-.04em;margin-bottom:10px}h3{font-size:1.45rem;letter-spacing:-.03em}
          .actions,.modalActions{display:flex;gap:12px;flex-wrap:wrap}.stack{display:flex;flex-direction:column;gap:20px}
          .hero{padding:28px 30px;border-radius:28px;display:flex;justify-content:space-between;align-items:flex-end;gap:24px;background:radial-gradient(circle at top right,rgba(192,255,0,.1),transparent 25%),rgba(255,255,255,.03)}.compactHero{padding:24px 30px}
          .stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.stat{padding:22px;border-radius:22px;display:flex;flex-direction:column;gap:8px}.stat span{color:var(--muted-foreground);font-size:.78rem;text-transform:uppercase;letter-spacing:.09em;font-weight:800}.stat strong{font-size:2rem;letter-spacing:-.03em}.stat small{color:var(--muted-foreground);line-height:1.45}.accent{background:linear-gradient(180deg,rgba(192,255,0,.08),rgba(192,255,0,.03));border-color:rgba(192,255,0,.18)}
          .agendaShell{display:block}.agendaMain,.clientsTable{padding:24px;border-radius:28px}
          .agendaMain{display:flex;flex-direction:column;gap:14px;background:linear-gradient(180deg,rgba(255,255,255,.04),rgba(255,255,255,.02)),rgba(255,255,255,.02)}.agendaHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.agendaHeaderRight{display:flex;align-items:flex-end;justify-content:flex-end;gap:10px;flex-wrap:wrap}.agendaActions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.todayBadges{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
          .dayNavigator{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:12px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.06)}.dayNavigator.today{background:linear-gradient(180deg,rgba(192,255,0,.12),rgba(192,255,0,.05));border-color:rgba(192,255,0,.24)}.dayNavigator.otherDay{background:linear-gradient(180deg,rgba(17,34,68,.75),rgba(10,20,40,.9));border-color:rgba(88,126,255,.22)}.dayNavigatorMain{min-width:0}.dayStepper{display:flex;align-items:center;gap:14px;min-width:0}.navDayBtn{padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.05);color:#fff;font-weight:700;white-space:nowrap;font-size:.95rem;flex:0 0 auto}.currentDayBlock{min-width:0;max-width:360px}.currentDayBlock span{display:block;font-size:.7rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted-foreground);font-weight:800;margin-bottom:4px}.currentDayBlock strong{display:block;font-size:1rem;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.dayNavigatorMeta{display:grid;grid-template-columns:auto auto auto;align-items:end;gap:10px 12px;justify-content:end}.todayShortcut{padding:9px 12px;border-radius:999px;background:rgba(255,255,255,.06);color:#fff;font-weight:700;font-size:.92rem}.todayShortcut.active{background:rgba(192,255,0,.14);color:var(--primary)}.dayNavigatorMeta label{display:flex;flex-direction:column;gap:4px;min-width:160px}.dayNavigatorMeta span{font-size:.68rem;color:var(--muted-foreground);text-transform:uppercase;font-weight:800;letter-spacing:.08em}.dayNavigatorMeta input{background:rgba(255,255,255,.03);border:1px solid var(--border);padding:8px 10px;border-radius:12px;color:#fff}
          .agendaToolbar{display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}.toolbarGroup{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.segmented{display:inline-flex;padding:4px;border-radius:999px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.05)}.segmented button{padding:10px 16px;border-radius:999px;background:transparent;color:var(--muted-foreground);font-size:.9rem;font-weight:700}.segmented button.active{background:rgba(192,255,0,.12);color:var(--primary)}
          .courtAgendaList{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px}.courtLane{padding:20px;border-radius:24px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.05);min-height:182px;display:flex;flex-direction:column}.courtLaneHeader{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}.courtLaneHeader.clickable{width:100%;text-align:left;background:transparent;padding:0;height:100%}.courtLane.collapsed .courtLaneHeader{flex-direction:column;align-items:flex-start;height:100%}.courtLaneHeader h4{font-size:1.28rem;line-height:1.1;letter-spacing:-.035em;margin-bottom:6px;font-weight:800;color:#f5f7fb}.courtLaneHeader p{color:rgba(226,232,240,.78);font-size:.98rem;line-height:1.35;font-weight:600;letter-spacing:-.01em}.laneStats{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;align-items:center}.courtLane.collapsed .laneStats{justify-content:flex-start;margin-top:auto}.collapseIcon{display:inline-flex;align-items:center;color:var(--muted-foreground);margin-left:auto}.collapsedHint{padding-top:8px;color:rgba(226,232,240,.72);font-size:1rem;line-height:1.45;letter-spacing:-.01em;margin-top:auto}
          .miniBadge{display:inline-flex;align-items:center;padding:7px 10px;border-radius:999px;font-size:.76rem;font-weight:800}.miniBadge.neutral{background:rgba(255,255,255,.05);color:#fff}.miniBadge.free{background:rgba(192,255,0,.1);color:var(--primary)}.miniBadge.busy{background:rgba(239,68,68,.12);color:#fca5a5}.miniBadge.closed{background:rgba(59,130,246,.16);color:#93c5fd}.miniBadge.dayOverride{background:rgba(59,130,246,.16);color:#bfdbfe}
          .miniAction{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);color:#fff;font-size:.78rem;font-weight:700}.miniAction.danger{background:rgba(239,68,68,.12);color:#fca5a5}
          .slotRow{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px}.slotCard{padding:14px 14px 16px;border-radius:18px;text-align:left;border:1px solid transparent;display:flex;flex-direction:column;gap:10px;min-height:114px}.slotTop{display:flex;align-items:center;justify-content:space-between;gap:10px}
          .statusPill{display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.statusPill.free{background:rgba(192,255,0,.14);color:var(--primary)}.statusPill.busy{background:rgba(239,68,68,.16);color:#fca5a5}
          .slotTime{display:inline-flex;align-items:center;gap:6px;font-size:.8rem;color:var(--muted-foreground);font-weight:700}.slotCard strong{font-size:1rem;letter-spacing:-.02em}.slotCard small{color:var(--muted-foreground);line-height:1.45}.slotCard.free{background:linear-gradient(180deg,rgba(192,255,0,.09),rgba(192,255,0,.04));border-color:rgba(192,255,0,.22);color:#fff}.slotCard.busy{background:linear-gradient(180deg,rgba(239,68,68,.11),rgba(239,68,68,.05));border-color:rgba(239,68,68,.22);color:#fff}
          .emptyState,.emptyLane{display:flex;align-items:center;gap:12px;padding:18px;border-radius:18px;background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.08);color:var(--muted-foreground)}.emptyState.large strong{display:block;color:#fff;margin-bottom:4px}
          .twoCols{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}.builder label,.modal label{display:flex;flex-direction:column;gap:8px;margin-bottom:18px}.builder label span,.modal label span{font-size:.78rem;font-weight:800;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:.08em}.builder input,.builder select,.modal input,.modal select,.modal textarea{width:100%;background:var(--secondary);border:1px solid var(--border);padding:13px 16px;border-radius:14px;color:#fff;font-size:.95rem}.builder input:focus,.builder select:focus,.modal input:focus,.modal select:focus,.modal textarea:focus{outline:none;border-color:var(--primary);background:rgba(192,255,0,.02)}.modal textarea{min-height:90px;font-family:inherit}
          .chipWrap{display:flex;flex-wrap:wrap;gap:10px}.chip{border-radius:999px;border:1px solid var(--border);background:var(--secondary);color:var(--muted-foreground);min-width:42px;height:42px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;font-weight:700}.chip.active{background:rgba(192,255,0,.14);border-color:rgba(192,255,0,.3);color:var(--primary)}
          .ruleList{display:flex;flex-direction:column;gap:16px;margin-top:6px}.ruleCard{padding:18px;border-radius:18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.05)}.ruleHeader{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:14px}.ruleHeader strong{display:block;font-size:1rem;margin-bottom:4px}.ruleHeader small{color:var(--muted-foreground);line-height:1.45}.windowList{display:flex;flex-direction:column;gap:10px;margin:10px 0 18px}.windowRow{display:grid;grid-template-columns:auto 1fr auto 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:14px;background:rgba(255,255,255,.03)}.windowRow strong{font-size:.85rem}.windowRow input{margin:0}.windowRow span{color:var(--muted-foreground);font-weight:700}.addWindow,.addRule{justify-content:center}.note{margin:22px 0;padding:14px 16px;border-radius:14px;background:rgba(255,255,255,.03);color:var(--muted-foreground);line-height:1.55}.wide{width:100%}
          .courtCards{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px}.courtCard{padding:24px;border-radius:22px;display:flex;align-items:flex-start;gap:18px;position:relative;transition:transform .2s}.courtCard:hover{transform:translateY(-4px);border-color:var(--primary)}.iconBox{width:56px;height:56px;background:rgba(192,255,0,.1);border-radius:14px;display:flex;align-items:center;justify-content:center;color:var(--primary)}.cardBody h3{font-size:1.15rem;margin-bottom:6px}.cardBody p{font-size:.88rem;color:var(--muted-foreground)}.meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.meta span{display:inline-flex;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.04);color:var(--muted-foreground);font-size:.76rem;font-weight:700}.metaAlert{background:rgba(59,130,246,.16)!important;color:#bfdbfe!important}.metaOk{background:rgba(192,255,0,.1)!important;color:var(--primary)!important}.closureInfo{margin-top:12px;line-height:1.5}.cardActions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.compact{padding:10px 14px;font-size:.86rem}.courtCard .icon-btn.danger{position:absolute;top:12px;right:12px;opacity:0;transition:opacity .2s}.courtCard:hover .icon-btn.danger{opacity:1}
          .venueEditor{padding:28px;border-radius:28px;display:grid;grid-template-columns:minmax(300px,360px) minmax(0,1fr);gap:28px;align-items:start}.venuePreview{display:flex;flex-direction:column;gap:18px;position:sticky;top:24px}.venueImageFrame{width:100%;aspect-ratio:16/10;border-radius:24px;overflow:hidden;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06)}.venueImageFrame img{width:100%;height:100%;object-fit:cover;display:block}.venueImagePlaceholder{width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-foreground);background:radial-gradient(circle at top,rgba(192,255,0,.08),transparent 34%),rgba(255,255,255,.02)}.uploadButton{display:inline-flex;align-items:center;justify-content:center;padding:12px 16px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#f5f7fb;font-weight:700;cursor:pointer;transition:background .18s ease,border-color .18s ease}.uploadButton:hover{background:rgba(255,255,255,.06);border-color:rgba(192,255,0,.22)}.uploadButton input{display:none}.venuePreviewText h3{font-size:1.4rem;letter-spacing:-.03em;margin-bottom:10px}.venuePreviewText p{display:flex;align-items:center;gap:10px;color:var(--muted-foreground);margin:8px 0}.venueFormGrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}.venueFormGrid label{display:flex;flex-direction:column;gap:8px}.venueFormGrid label span{font-size:.78rem;font-weight:800;color:var(--muted-foreground);text-transform:uppercase;letter-spacing:.08em}.venueFormGrid input{width:100%;background:var(--secondary);border:1px solid var(--border);padding:13px 16px;border-radius:14px;color:#fff;font-size:.96rem;transition:border-color .18s ease,background .18s ease}.venueFormGrid input:focus{outline:none;border-color:var(--primary);background:rgba(192,255,0,.02)}.wideField{grid-column:1/-1}.venueActions{display:flex;gap:12px;flex-wrap:wrap;justify-content:flex-end;margin-top:22px;padding-top:22px;border-top:1px solid rgba(255,255,255,.06)}
          .admin-table{width:100%;border-collapse:collapse}.admin-table th{text-align:left;padding:16px 24px;background:rgba(255,255,255,.02);color:var(--muted-foreground);font-size:.8rem;text-transform:uppercase}.admin-table td{padding:16px 24px;border-top:1px solid var(--border);font-size:.95rem}
          .dangerGhost{background:rgba(239,68,68,.12);color:#fca5a5}.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;z-index:100;padding:24px}.modal{width:430px;padding:32px;border-radius:20px;background:#121316;border:1px solid rgba(255,255,255,.08);box-shadow:0 28px 64px rgba(0,0,0,.46)}.availabilityModal{width:min(780px,100%);max-height:90vh;overflow:auto;background:#111214}.courtAgendaModal{width:min(980px,100%);display:flex;flex-direction:column;max-height:88vh;overflow:hidden;background:#0f1013}.courtAgendaBody{overflow:auto;padding-right:8px;margin-right:-8px}.courtAgendaBody::-webkit-scrollbar,.availabilityModal::-webkit-scrollbar{width:12px}.courtAgendaBody::-webkit-scrollbar-track,.availabilityModal::-webkit-scrollbar-track{background:rgba(255,255,255,.04);border-radius:999px}.courtAgendaBody::-webkit-scrollbar-thumb,.availabilityModal::-webkit-scrollbar-thumb{background:rgba(192,255,0,.24);border:3px solid rgba(17,18,20,.9);border-radius:999px}.closeModalBtn{min-width:116px}.closeFooterBtn{min-width:140px}.bookingContext{display:flex;flex-wrap:wrap;gap:10px;margin:18px 0 22px}.contextPill{display:inline-flex;align-items:center;padding:10px 14px;border-radius:999px;background:rgba(255,255,255,.05);color:#eef2ff;font-size:.88rem;font-weight:700;line-height:1}.contextPill.strong{background:rgba(192,255,0,.14);color:var(--primary)}.modalSlotRow{margin-top:6px}.modalHeader{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}.courtAgendaModal .modalHeader{padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06)}.courtAgendaModal .modalActions{padding-top:16px;margin-top:18px;border-top:1px solid rgba(255,255,255,.06)}
          @media (max-width:1200px){.stats{grid-template-columns:1fr 1fr}.hero{flex-direction:column;align-items:flex-start}}
          @media (max-width:860px){.layout{display:block}.sidebar{position:relative;top:auto;left:auto;width:100%;height:auto;border-right:none;border-bottom:1px solid var(--border);padding:16px 20px}.sidebar:hover{width:100%;padding-inline:20px;box-shadow:none}.brand,.sidebar:hover .brand,.menu button,.sidebarFooter button,.sidebar:hover .menu button,.sidebar:hover .sidebarFooter button{justify-content:flex-start}.brandLabel,.navLabel,.venueRailMeta{opacity:1;transform:none;pointer-events:auto;width:auto}.main{margin-left:0;padding:20px 16px 32px}.agendaHeader,.agendaHeaderRight,.agendaActions,.courtLaneHeader,.agendaToolbar,.toolbarGroup,.ruleHeader{flex-direction:column;align-items:flex-start}.dayNavigator{grid-template-columns:1fr}.dayStepper{grid-template-columns:1fr}.dayNavigatorMeta{grid-template-columns:1fr}.stats,.twoCols,.courtAgendaList,.venueEditor,.venueFormGrid{grid-template-columns:1fr}.slotRow{grid-template-columns:1fr}.windowRow{grid-template-columns:1fr}}
        ` }} />
      </main>
    </div>
  );
}
