const COURT_TYPES = ['Cristal', 'Muro', 'Panoramica'];

export const EMPTY_COURT_FORM = {
  id: null,
  name: '',
  type: COURT_TYPES[0],
  surface: '',
  enclosure: '',
  image: '',
};

export function createWindow(start_time = '08:00', end_time = '15:00') {
  return { id: Date.now() + Math.random(), start_time, end_time };
}

export function createRule(weekdays = [1, 2, 3], windows = [createWindow('08:00', '15:00'), createWindow('17:00', '23:30')]) {
  return { id: Date.now() + Math.random(), weekdays, windows };
}

export function slotsToWindows(slots) {
  const sorted = [...slots].sort((a, b) => a.time.localeCompare(b.time));
  if (!sorted.length) return [createWindow('08:00', '15:00')];

  const windows = [];
  let start = sorted[0].time;
  let lastMinutes = sorted[0].time.split(':').map(Number).reduce((h, m) => h * 60 + m);

  for (let index = 1; index < sorted.length; index += 1) {
    const currentMinutes = sorted[index].time.split(':').map(Number).reduce((h, m) => h * 60 + m);
    if (currentMinutes !== lastMinutes + 90) {
      const endMinutes = lastMinutes + 90;
      windows.push(createWindow(start, `${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}`));
      start = sorted[index].time;
    }
    lastMinutes = currentMinutes;
  }

  const finalEndMinutes = lastMinutes + 90;
  windows.push(createWindow(start, `${String(Math.floor(finalEndMinutes / 60)).padStart(2, '0')}:${String(finalEndMinutes % 60).padStart(2, '0')}`));
  return windows;
}

export function createVenueFormState(venue) {
  return {
    name: venue?.name || '',
    address: venue?.address || '',
    phone: venue?.phone || '',
    image: venue?.image || '',
    price_per_slot: venue?.price_per_slot ?? '',
    services: Array.isArray(venue?.services) ? venue.services : [],
  };
}

export function createCourtFormState(court = null) {
  if (!court) return { ...EMPTY_COURT_FORM };

  return {
    id: court.id,
    name: court.name || '',
    type: court.type || COURT_TYPES[0],
    surface: court.surface || '',
    enclosure: court.enclosure || '',
    image: court.image || '',
  };
}
