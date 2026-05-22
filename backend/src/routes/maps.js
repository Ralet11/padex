const express = require('express');

const router = express.Router();

const GOOGLE_STATIC_MAPS_BASE_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const DEFAULT_WIDTH = 640;
const DEFAULT_HEIGHT = 360;
const DEFAULT_ZOOM = 15;
const DEFAULT_SCALE = 2;

function normalizeString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function getMapsStaticApiKey() {
  return normalizeString(process.env.GOOGLE_MAPS_STATIC_API_KEY)
    || normalizeString(process.env.GOOGLE_MAPS_API_KEY)
    || '';
}

function clampNumber(value, { min, max, fallback }) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.min(max, Math.max(min, numericValue));
}

function buildLocationQuery({ query, name, address }) {
  const normalizedQuery = normalizeString(query);
  if (normalizedQuery) return normalizedQuery;

  return [normalizeString(name), normalizeString(address)].filter(Boolean).join(', ');
}

function buildStaticMapUrl({ query, width, height, zoom, scale, mapType }) {
  const apiKey = getMapsStaticApiKey();
  if (!apiKey) return null;

  const search = new URLSearchParams({
    center: query,
    zoom: String(zoom),
    size: `${width}x${height}`,
    scale: String(scale),
    maptype: mapType,
    language: 'es',
    region: 'ar',
    markers: `size:mid|color:0x0B57D0|${query}`,
    key: apiKey,
  });

  return `${GOOGLE_STATIC_MAPS_BASE_URL}?${search.toString()}`;
}

router.get('/static-preview', async (req, res) => {
  const query = buildLocationQuery(req.query);
  if (!query) {
    return res.status(400).json({
      error: 'La direccion es requerida para generar la vista previa.',
      code: 'maps_static_missing_query',
    });
  }

  const width = clampNumber(req.query.width, { min: 160, max: 640, fallback: DEFAULT_WIDTH });
  const height = clampNumber(req.query.height, { min: 120, max: 640, fallback: DEFAULT_HEIGHT });
  const zoom = clampNumber(req.query.zoom, { min: 10, max: 18, fallback: DEFAULT_ZOOM });
  const scale = clampNumber(req.query.scale, { min: 1, max: 2, fallback: DEFAULT_SCALE });
  const mapType = normalizeString(req.query.maptype) || 'roadmap';

  const mapUrl = buildStaticMapUrl({ query, width, height, zoom, scale, mapType });
  if (!mapUrl) {
    return res.status(503).json({
      error: 'Maps Static API no esta configurado en el backend.',
      code: 'maps_static_not_configured',
    });
  }

  try {
    const response = await fetch(mapUrl, {
      headers: {
        Accept: 'image/*',
        'User-Agent': 'padex-backend/1.0 static-map-proxy',
      },
    });

    const contentType = response.headers.get('content-type') || 'image/png';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!response.ok) {
      res.status(response.status);

      if (contentType.startsWith('image/')) {
        res.setHeader('Content-Type', contentType);
        return res.send(buffer);
      }

      const upstreamBody = buffer.toString('utf8').slice(0, 1200);

      return res.json({
        error: 'Google Maps devolvio un error al generar la vista previa.',
        code: 'maps_static_upstream_error',
        upstream_status: response.status,
        upstream_content_type: contentType,
        upstream_body_excerpt: upstreamBody,
      });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=900');
    return res.send(buffer);
  } catch (error) {
    console.error('[maps] static preview error:', error?.message || error);
    return res.status(502).json({
      error: 'No se pudo generar la vista previa del mapa.',
      code: 'maps_static_fetch_failed',
    });
  }
});

module.exports = router;
