const CLUB_SERVICE_OPTIONS = [
    { value: 'wifi', label: 'Wifi' },
    { value: 'vestuario', label: 'Vestuario' },
    { value: 'gimnasio', label: 'Gimnasio' },
    { value: 'estacionamiento', label: 'Estacionamiento' },
    { value: 'parrillas', label: 'Parrillas' },
];

const COURT_SURFACE_OPTIONS = [
    { value: 'parquet', label: 'Parquet' },
    { value: 'flotante', label: 'Flotante' },
    { value: 'sintetico', label: 'Sintetico' },
    { value: 'cemento', label: 'Cemento' },
    { value: 'cesped_natural', label: 'Cesped natural' },
];

const COURT_ENCLOSURE_OPTIONS = [
    { value: 'cubierta', label: 'Cubierta' },
    { value: 'descubierta', label: 'Descubierta' },
];

const CLUB_SERVICE_SET = new Set(CLUB_SERVICE_OPTIONS.map((item) => item.value));
const COURT_SURFACE_SET = new Set(COURT_SURFACE_OPTIONS.map((item) => item.value));
const COURT_ENCLOSURE_SET = new Set(COURT_ENCLOSURE_OPTIONS.map((item) => item.value));

function createValidationError(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
}

function dedupe(values) {
    return [...new Set(values)];
}

function normalizeSlug(value) {
    return String(value || '').trim().toLowerCase();
}

function normalizeMultiSelect(input, allowedSet, fieldName) {
    if (input === undefined || input === null || input === '') return [];

    const rawValues = Array.isArray(input) ? input : String(input).split(',');
    const values = dedupe(rawValues.map(normalizeSlug).filter(Boolean));
    const invalidValues = values.filter((value) => !allowedSet.has(value));

    if (invalidValues.length > 0) {
        throw createValidationError(`Valores invalidos para ${fieldName}: ${invalidValues.join(', ')}`);
    }

    return values;
}

function normalizeSingleSelect(input, allowedSet, fieldName) {
    if (input === undefined || input === null || input === '') return null;

    const value = normalizeSlug(input);
    if (!allowedSet.has(value)) {
        throw createValidationError(`Valor invalido para ${fieldName}: ${value}`);
    }

    return value;
}

function normalizeVenueServices(input) {
    return normalizeMultiSelect(input, CLUB_SERVICE_SET, 'services');
}

function normalizeCourtSurface(input) {
    return normalizeSingleSelect(input, COURT_SURFACE_SET, 'surface');
}

function normalizeCourtEnclosure(input) {
    return normalizeSingleSelect(input, COURT_ENCLOSURE_SET, 'enclosure');
}

function courtMatchesFilters(court, { surface = null, enclosure = null } = {}) {
    if (!court) return false;
    if (surface && court.surface !== surface) return false;
    if (enclosure && court.enclosure !== enclosure) return false;
    return true;
}

function summarizeCourtMetadata(courts = []) {
    return {
        available_surfaces: dedupe(courts.map((court) => court.surface).filter(Boolean)),
        available_enclosures: dedupe(courts.map((court) => court.enclosure).filter(Boolean)),
    };
}

module.exports = {
    CLUB_SERVICE_OPTIONS,
    COURT_SURFACE_OPTIONS,
    COURT_ENCLOSURE_OPTIONS,
    normalizeVenueServices,
    normalizeCourtSurface,
    normalizeCourtEnclosure,
    courtMatchesFilters,
    summarizeCourtMetadata,
};
