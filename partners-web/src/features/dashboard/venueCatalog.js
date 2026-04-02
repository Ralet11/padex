export const CLUB_SERVICE_OPTIONS = [
  { value: 'wifi', label: 'Wifi' },
  { value: 'vestuario', label: 'Vestuario' },
  { value: 'gimnasio', label: 'Gimnasio' },
  { value: 'estacionamiento', label: 'Estacionamiento' },
  { value: 'parrillas', label: 'Parrillas' },
];

export const COURT_SURFACE_OPTIONS = [
  { value: 'parquet', label: 'Parquet' },
  { value: 'flotante', label: 'Flotante' },
  { value: 'sintetico', label: 'Sintetico' },
  { value: 'cemento', label: 'Cemento' },
  { value: 'cesped_natural', label: 'Cesped natural' },
];

export const COURT_ENCLOSURE_OPTIONS = [
  { value: 'cubierta', label: 'Cubierta' },
  { value: 'descubierta', label: 'Descubierta' },
];

export const SERVICE_LABELS = Object.fromEntries(CLUB_SERVICE_OPTIONS.map((item) => [item.value, item.label]));
export const SURFACE_LABELS = Object.fromEntries(COURT_SURFACE_OPTIONS.map((item) => [item.value, item.label]));
export const ENCLOSURE_LABELS = Object.fromEntries(COURT_ENCLOSURE_OPTIONS.map((item) => [item.value, item.label]));
