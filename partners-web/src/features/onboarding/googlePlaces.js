let googleMapsScriptPromise = null;

const GOOGLE_MAPS_SCRIPT_ID = 'padex-google-maps-places';

function findAddressComponent(components, acceptedTypes) {
  return (
    components.find((component) =>
      acceptedTypes.some((type) => component.types?.includes(type))
    )?.long_name || ''
  );
}

export function loadGoogleMapsPlaces(apiKey) {
  const normalizedKey = typeof apiKey === 'string' ? apiKey.trim() : '';

  if (!normalizedKey) {
    return Promise.reject(new Error('missing-api-key'));
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('window-unavailable'));
  }

  if (window.google?.maps?.places) {
    return Promise.resolve(window.google);
  }

  if (googleMapsScriptPromise) {
    return googleMapsScriptPromise;
  }

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(GOOGLE_MAPS_SCRIPT_ID);

    const resolveIfReady = () => {
      if (window.google?.maps?.places) {
        resolve(window.google);
        return true;
      }

      return false;
    };

    const handleLoad = () => {
      if (!resolveIfReady()) {
        googleMapsScriptPromise = null;
        reject(new Error('places-unavailable'));
      }
    };

    const handleError = () => {
      googleMapsScriptPromise = null;
      reject(new Error('script-load-failed'));
    };

    if (existingScript) {
      if (resolveIfReady()) {
        return;
      }

      existingScript.addEventListener('load', handleLoad, { once: true });
      existingScript.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    const params = new URLSearchParams({
      key: normalizedKey,
      libraries: 'places',
      language: 'es',
      region: 'AR',
      v: 'weekly',
    });

    script.id = GOOGLE_MAPS_SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });

    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
}

export function extractAddressMetadata(place) {
  const components = Array.isArray(place?.address_components) ? place.address_components : [];
  const location = place?.geometry?.location;

  return {
    formattedAddress: place?.formatted_address || place?.name || '',
    placeId: place?.place_id || '',
    locality:
      findAddressComponent(components, ['locality', 'postal_town']) ||
      findAddressComponent(components, ['administrative_area_level_2', 'sublocality_level_1']),
    region: findAddressComponent(components, ['administrative_area_level_1']),
    country: findAddressComponent(components, ['country']),
    lat: typeof location?.lat === 'function' ? location.lat() : null,
    lng: typeof location?.lng === 'function' ? location.lng() : null,
  };
}

export function buildGoogleMapsSearchUrl(formattedAddress, placeId) {
  const url = new URL('https://www.google.com/maps/search/');

  url.searchParams.set('api', '1');

  if (formattedAddress) {
    url.searchParams.set('query', formattedAddress);
  }

  if (placeId) {
    url.searchParams.set('query_place_id', placeId);
  }

  return url.toString();
}
