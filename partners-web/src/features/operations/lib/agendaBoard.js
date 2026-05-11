export const BOARD_STEP_MINUTES = 30;
export const DEFAULT_BOARD_START_MINUTES = 7 * 60;
export const DEFAULT_BOARD_END_MINUTES = 23 * 60;
export const DEFAULT_SLOT_DURATION = 90;

export function parseTimeToMinutes(time) {
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return null;

  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || minutes < 0 || minutes >= 60) return null;

  return (hours * 60) + minutes;
}

export function formatMinutesToTime(totalMinutes) {
  if (!Number.isFinite(totalMinutes)) return '--:--';

  const normalizedMinutes = Math.max(0, Math.trunc(totalMinutes));
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function formatBoardHour(totalMinutes) {
  return String(Math.floor(totalMinutes / 60)).padStart(2, '0');
}

export function formatSlotRange(slot) {
  const startMinutes = parseTimeToMinutes(slot?.time);
  const duration = Number(slot?.duration || DEFAULT_SLOT_DURATION);

  if (startMinutes === null || !Number.isFinite(duration) || duration <= 0) {
    return '--:--';
  }

  return `${formatMinutesToTime(startMinutes)} - ${formatMinutesToTime(startMinutes + duration)}`;
}

function floorToHour(minutes) {
  return Math.floor(minutes / 60) * 60;
}

function ceilToHour(minutes) {
  return Math.ceil(minutes / 60) * 60;
}

export function buildTimelineFromSlots(slots, options = {}) {
  const stepMinutes = options.stepMinutes || BOARD_STEP_MINUTES;
  const fallbackStartMinutes = options.fallbackStartMinutes || DEFAULT_BOARD_START_MINUTES;
  const fallbackEndMinutes = options.fallbackEndMinutes || DEFAULT_BOARD_END_MINUTES;
  const minVisibleStartMinutes = options.minVisibleStartMinutes || fallbackStartMinutes;
  const maxVisibleEndMinutes = options.maxVisibleEndMinutes || fallbackEndMinutes;

  let minStart = Infinity;
  let maxEnd = -Infinity;

  (slots || []).forEach((slot) => {
    const startMinutes = parseTimeToMinutes(slot?.time);
    const duration = Number(slot?.duration || DEFAULT_SLOT_DURATION);

    if (startMinutes === null || !Number.isFinite(duration) || duration <= 0) return;

    minStart = Math.min(minStart, startMinutes);
    maxEnd = Math.max(maxEnd, startMinutes + duration);
  });

  const hasMeasuredSlots = Number.isFinite(minStart) && Number.isFinite(maxEnd);
  const startMinutes = hasMeasuredSlots
    ? Math.min(floorToHour(minStart), minVisibleStartMinutes)
    : minVisibleStartMinutes;
  const endMinutes = hasMeasuredSlots
    ? Math.max(ceilToHour(maxEnd), maxVisibleEndMinutes)
    : maxVisibleEndMinutes;
  const totalSteps = Math.max(1, Math.ceil((endMinutes - startMinutes) / stepMinutes));
  const hourMarkers = [];

  for (let minutes = startMinutes; minutes < endMinutes; minutes += 60) {
    hourMarkers.push({
      label: formatBoardHour(minutes),
      columnStart: Math.floor((minutes - startMinutes) / stepMinutes) + 1,
      spanSteps: Math.max(1, Math.round(60 / stepMinutes)),
    });
  }

  return {
    startMinutes,
    endMinutes,
    stepMinutes,
    totalSteps,
    hourMarkers,
  };
}

export function getSlotLayout(slot, timeline) {
  const startMinutes = parseTimeToMinutes(slot?.time);
  const duration = Number(slot?.duration || DEFAULT_SLOT_DURATION);
  const stepMinutes = timeline?.stepMinutes || BOARD_STEP_MINUTES;

  if (
    startMinutes === null
    || !Number.isFinite(duration)
    || duration <= 0
    || !timeline
    || !Number.isFinite(timeline.startMinutes)
  ) {
    return null;
  }

  return {
    startMinutes,
    endMinutes: startMinutes + duration,
    columnStart: Math.max(1, Math.floor((startMinutes - timeline.startMinutes) / stepMinutes) + 1),
    columnSpan: Math.max(1, Math.ceil(duration / stepMinutes)),
  };
}
