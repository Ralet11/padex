import Constants from 'expo-constants';
import { BASE_URL } from '../services/api';

const GOOGLE_MAPS_SEARCH_BASE_URL = 'https://www.google.com/maps/search/?api=1';
const GOOGLE_STATIC_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const BACKEND_STATIC_MAPS_PATH = '/api/maps/static-preview';
const DEFAULT_STATIC_MAP_WIDTH = 640;
const DEFAULT_STATIC_MAP_HEIGHT = 360;

function normalizeString(value) {
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  return trimmed || null;
}

export function getLocationName(location) {
  return normalizeString(location?.venue_name) || normalizeString(location?.name) || null;
}

export function getLocationAddress(location) {
  return normalizeString(location?.venue_address) || normalizeString(location?.address) || null;
}

export function getLocationQuery(location) {
  return [getLocationName(location), getLocationAddress(location)].filter(Boolean).join(', ');
}

export function getGoogleMapsSearchUrl(location) {
  const query = getLocationQuery(location);
  if (!query) return null;
  return `${GOOGLE_MAPS_SEARCH_BASE_URL}&query=${encodeURIComponent(query)}`;
}

export function getGoogleMapsApiKey() {
  return (
    normalizeString(process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
    || normalizeString(Constants.expoConfig?.extra?.googleMapsApiKey)
    || null
  );
}

export function getBackendStaticVenueMapUrl(location, options = {}) {
  const query = getLocationQuery(location);
  if (!query) return null;

  const width = Number(options.width) > 0 ? Number(options.width) : DEFAULT_STATIC_MAP_WIDTH;
  const height = Number(options.height) > 0 ? Number(options.height) : DEFAULT_STATIC_MAP_HEIGHT;
  const zoom = Number(options.zoom) > 0 ? Number(options.zoom) : 15;
  const scale = Number(options.scale) === 1 ? 1 : 2;
  const mapType = normalizeString(options.mapType) || 'roadmap';

  const search = new URLSearchParams({
    query,
    width: String(width),
    height: String(height),
    zoom: String(zoom),
    scale: String(scale),
    maptype: mapType,
  });

  return `${BASE_URL}${BACKEND_STATIC_MAPS_PATH}?${search.toString()}`;
}

export function getGoogleStaticVenueMapUrl(location, options = {}) {
  const query = getLocationQuery(location);
  const apiKey = getGoogleMapsApiKey();

  if (!query || !apiKey) return null;

  const width = Number(options.width) > 0 ? Number(options.width) : DEFAULT_STATIC_MAP_WIDTH;
  const height = Number(options.height) > 0 ? Number(options.height) : DEFAULT_STATIC_MAP_HEIGHT;
  const zoom = Number(options.zoom) > 0 ? Number(options.zoom) : 15;
  const scale = Number(options.scale) === 1 ? 1 : 2;
  const mapType = normalizeString(options.mapType) || 'roadmap';
  const markerColor = normalizeString(options.markerColor) || '0x0B57D0';

  const params = [
    ['center', query],
    ['zoom', String(zoom)],
    ['size', `${width}x${height}`],
    ['scale', String(scale)],
    ['maptype', mapType],
    ['language', 'es'],
    ['region', 'ar'],
    ['markers', `size:mid|color:${markerColor}|${query}`],
    ['key', apiKey],
  ];

  const search = params
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');

  return `${GOOGLE_STATIC_MAPS_BASE_URL}?${search}`;
}

export function getVenueMapPreviewSources(location, options = {}) {
  return [
    getBackendStaticVenueMapUrl(location, options),
    getGoogleStaticVenueMapUrl(location, options),
  ].filter(Boolean);
}
