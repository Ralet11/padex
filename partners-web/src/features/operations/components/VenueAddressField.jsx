import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, LoaderCircle, MapPin } from 'lucide-react';
import {
  buildGoogleMapsSearchUrl,
  extractAddressMetadata,
  loadGoogleMapsPlaces,
} from '../../onboarding/googlePlaces';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
const DEFAULT_MAP_CENTER = { lat: -34.603722, lng: -58.381592 };
const DEFAULT_MAP_ZOOM = 12;
const FOCUSED_MAP_ZOOM = 17;

function isFiniteCoordinate(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function getLocationLiteral(lat, lng) {
  if (!isFiniteCoordinate(lat) || !isFiniteCoordinate(lng)) {
    return null;
  }

  return { lat, lng };
}

function reverseGeocodeLocation(geocoder, location) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location }, (results, status) => {
      if (status === 'OK' && Array.isArray(results) && results.length > 0) {
        resolve(results[0]);
        return;
      }

      reject(new Error(status || 'reverse-geocode-failed'));
    });
  });
}

function geocodeAddress(geocoder, address) {
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && Array.isArray(results) && results.length > 0) {
        resolve(results[0]);
        return;
      }

      reject(new Error(status || 'address-geocode-failed'));
    });
  });
}

function getAddressStatusCopy(status) {
  switch (status) {
    case 'loading':
      return {
        tone: 'neutral',
        title: 'Cargando Google Places',
        message: 'En unos segundos podras buscar y ajustar la direccion desde el mapa.',
      };
    case 'ready':
      return {
        tone: 'success',
        title: 'Mapa listo',
        message: 'Busca la direccion y, si hace falta, mueve el pin para afinar el punto exacto.',
      };
    case 'missing-key':
      return {
        tone: 'warning',
        title: 'Falta la API key',
        message: 'Configura VITE_GOOGLE_MAPS_API_KEY para habilitar el ajuste con mapa.',
      };
    default:
      return {
        tone: 'warning',
        title: 'No se pudo cargar Google Places',
        message: 'Puedes seguir con direccion manual, pero el ajuste fino del mapa queda inactivo.',
      };
  }
}

export default function VenueAddressField({ venueForm, setVenueForm }) {
  const [mapsStatus, setMapsStatus] = useState(GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key');
  const [mapError, setMapError] = useState('');
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    if (!GOOGLE_MAPS_API_KEY) {
      setMapsStatus('missing-key');
      return undefined;
    }

    setMapsStatus('loading');

    loadGoogleMapsPlaces(GOOGLE_MAPS_API_KEY)
      .then(() => {
        if (!ignore) {
          setMapsStatus('ready');
        }
      })
      .catch(() => {
        if (!ignore) {
          setMapsStatus('error');
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (mapsStatus !== 'ready' || !inputRef.current || autocompleteRef.current || !window.google?.maps?.places) {
      return undefined;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
    });

    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const metadata = extractAddressMetadata(place);

      if (!metadata.formattedAddress) {
        return;
      }

      setMapError('');
      setVenueForm((previous) => ({
        ...previous,
        address: metadata.formattedAddress,
        address_place_id: metadata.placeId,
        address_locality: metadata.locality,
        address_region: metadata.region,
        address_country: metadata.country,
        address_lat: metadata.lat,
        address_lng: metadata.lng,
        address_selection_mode: 'places',
      }));
    });

    return () => {
      listener?.remove?.();
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
      autocompleteRef.current = null;
    };
  }, [mapsStatus, setVenueForm]);

  useEffect(() => {
    if (mapsStatus !== 'ready' || !mapElementRef.current || mapRef.current || !window.google?.maps) {
      return undefined;
    }

    const googleMaps = window.google.maps;
    const map = new googleMaps.Map(mapElementRef.current, {
      center: DEFAULT_MAP_CENTER,
      zoom: DEFAULT_MAP_ZOOM,
      disableDefaultUI: true,
      zoomControl: true,
      clickableIcons: false,
      gestureHandling: 'greedy',
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    const marker = new googleMaps.Marker({
      map,
      draggable: true,
      visible: false,
      animation: googleMaps.Animation.DROP,
    });
    const geocoder = new googleMaps.Geocoder();

    mapRef.current = map;
    markerRef.current = marker;
    geocoderRef.current = geocoder;

    const resolvePickedLocation = async (latLng, selectionMode) => {
      setMapError('');
      setIsResolvingLocation(true);
      marker.setPosition(latLng);
      marker.setVisible(true);
      map.panTo(latLng);

      try {
        const geocodedPlace = await reverseGeocodeLocation(geocoder, latLng);
        const metadata = extractAddressMetadata(geocodedPlace);
        map.setZoom(FOCUSED_MAP_ZOOM);

        setVenueForm((previous) => ({
          ...previous,
          address: metadata.formattedAddress,
          address_place_id: metadata.placeId,
          address_locality: metadata.locality,
          address_region: metadata.region,
          address_country: metadata.country,
          address_lat: metadata.lat,
          address_lng: metadata.lng,
          address_selection_mode: selectionMode,
        }));
      } catch (error) {
        console.error(error);
        setMapError('No pudimos convertir ese punto en una direccion valida. Prueba mover un poco mas el pin.');
      } finally {
        setIsResolvingLocation(false);
      }
    };

    const mapClickListener = map.addListener('click', (event) => {
      if (!event.latLng) return;
      void resolvePickedLocation(event.latLng, 'map');
    });

    const markerDragListener = marker.addListener('dragend', (event) => {
      if (!event.latLng) return;
      void resolvePickedLocation(event.latLng, 'pin');
    });

    return () => {
      mapClickListener?.remove?.();
      markerDragListener?.remove?.();
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(marker);
        window.google.maps.event.clearInstanceListeners(map);
      }
      markerRef.current = null;
      mapRef.current = null;
      geocoderRef.current = null;
    };
  }, [mapsStatus, setVenueForm]);

  useEffect(() => {
    if (mapsStatus !== 'ready' || !mapRef.current || !markerRef.current) {
      return;
    }

    const nextLocation = getLocationLiteral(venueForm.address_lat, venueForm.address_lng);

    if (!nextLocation) {
      markerRef.current.setVisible(false);
      mapRef.current.setCenter(DEFAULT_MAP_CENTER);
      mapRef.current.setZoom(DEFAULT_MAP_ZOOM);
      return;
    }

    markerRef.current.setPosition(nextLocation);
    markerRef.current.setVisible(true);
    mapRef.current.setCenter(nextLocation);
    if ((mapRef.current.getZoom() || 0) < FOCUSED_MAP_ZOOM) {
      mapRef.current.setZoom(FOCUSED_MAP_ZOOM);
    }
  }, [mapsStatus, venueForm.address_lat, venueForm.address_lng]);

  useEffect(() => {
    if (
      mapsStatus !== 'ready' ||
      !geocoderRef.current ||
      !venueForm.address?.trim() ||
      isFiniteCoordinate(venueForm.address_lat) ||
      isFiniteCoordinate(venueForm.address_lng)
    ) {
      return undefined;
    }

    let cancelled = false;

    geocodeAddress(geocoderRef.current, venueForm.address.trim())
      .then((place) => {
        if (cancelled) return;

        const metadata = extractAddressMetadata(place);
        if (!metadata.formattedAddress) {
          return;
        }

        setVenueForm((previous) => {
          if (isFiniteCoordinate(previous.address_lat) && isFiniteCoordinate(previous.address_lng)) {
            return previous;
          }

          return {
            ...previous,
            address: previous.address || metadata.formattedAddress,
            address_place_id: previous.address_place_id || metadata.placeId,
            address_locality: previous.address_locality || metadata.locality,
            address_region: previous.address_region || metadata.region,
            address_country: previous.address_country || metadata.country,
            address_lat: metadata.lat,
            address_lng: metadata.lng,
          };
        });
      })
      .catch(() => {
        // Existing manual addresses can remain as free text if Google cannot geocode them.
      });

    return () => {
      cancelled = true;
    };
  }, [
    mapsStatus,
    setVenueForm,
    venueForm.address,
    venueForm.address_lat,
    venueForm.address_lng,
  ]);

  const handleAddressChange = (value) => {
    setMapError('');
    setVenueForm((previous) => {
      if (value === previous.address) {
        return previous;
      }

      return {
        ...previous,
        address: value,
        address_place_id: '',
        address_locality: '',
        address_region: '',
        address_country: '',
        address_lat: null,
        address_lng: null,
        address_selection_mode: '',
      };
    });
  };

  const hasConfirmedAddress = Boolean(venueForm.address_place_id);
  const hasConfirmedCoordinates = isFiniteCoordinate(venueForm.address_lat) && isFiniteCoordinate(venueForm.address_lng);
  const coordinatesLabel = hasConfirmedCoordinates
    ? `${venueForm.address_lat.toFixed(6)}, ${venueForm.address_lng.toFixed(6)}`
    : '';
  const addressRegionLine = [
    venueForm.address_locality,
    venueForm.address_region,
    venueForm.address_country,
  ]
    .filter(Boolean)
    .join(', ');
  const googleMapsUrl = hasConfirmedAddress
    ? buildGoogleMapsSearchUrl(venueForm.address, venueForm.address_place_id)
    : '';
  const isMapAdjustedAddress =
    venueForm.address_selection_mode === 'map' || venueForm.address_selection_mode === 'pin';
  const addressStatus = getAddressStatusCopy(mapsStatus);

  return (
    <div className="wideField venueAddressField">
      <span>Direccion</span>
      <div className="venueAddressLayout">
        <div className="venueAddressMain">
          <div className="venueAddressInputWrap">
            <MapPin size={18} className="venueAddressInputIcon" />
            <input
              ref={inputRef}
              type="text"
              value={venueForm.address}
              onChange={(event) => handleAddressChange(event.target.value)}
              placeholder="Ej: Santa Fe 435"
              autoComplete="street-address"
            />
            {mapsStatus === 'loading' ? (
              <LoaderCircle size={18} className="venueAddressInputStatus spinning" />
            ) : null}
            {mapsStatus === 'ready' && hasConfirmedAddress ? (
              <Check size={18} className="venueAddressInputStatus venueAddressInputStatusOk" />
            ) : null}
          </div>

          {mapsStatus === 'ready' ? (
            <div className={`venueAddressMapCard ${hasConfirmedAddress ? 'confirmed' : ''}`}>
              <div className="venueAddressMapHeader">
                <div>
                  <strong>Ajuste fino en mapa</strong>
                  <p>Haz click en el mapa o arrastra el pin para dejar el punto exacto de la sede.</p>
                </div>
              </div>

              <div className="venueAddressMapCanvasWrap">
                <div ref={mapElementRef} className="venueAddressMapCanvas" />
                {isResolvingLocation ? (
                  <div className="venueAddressMapOverlay">
                    <LoaderCircle size={18} className="spinning" />
                    <span>Actualizando direccion desde el mapa...</span>
                  </div>
                ) : null}
              </div>

              <div className="venueAddressMapFooter">
                <span>{hasConfirmedAddress ? 'Pin activo y direccion validada.' : 'Aun no hay una ubicacion confirmada.'}</span>
                <span>{hasConfirmedAddress ? 'Puedes seguir moviendo el pin si necesitas afinar mas.' : 'Primero busca una direccion o marca el punto manualmente.'}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="venueAddressSide">
          <div className={`venueAddressStatus ${addressStatus.tone}`}>
            <AlertCircle size={18} />
            <div>
              <strong>{addressStatus.title}</strong>
              <p>{addressStatus.message}</p>
            </div>
          </div>

          {venueForm.address ? (
            <div className={`venueAddressPreview ${hasConfirmedAddress ? 'confirmed' : 'manual'}`}>
              <div className="venueAddressPreviewHeader">
                <div className="venueAddressPreviewBadge">
                  {hasConfirmedAddress ? <Check size={14} /> : <MapPin size={14} />}
                </div>
                <div>
                  <strong>
                    {hasConfirmedAddress
                      ? isMapAdjustedAddress
                        ? 'Ubicacion ajustada en el mapa'
                        : 'Direccion confirmada'
                      : 'Direccion en carga manual'}
                  </strong>
                  <p>
                    {hasConfirmedAddress
                      ? isMapAdjustedAddress
                        ? 'La direccion fue refinada directamente con el pin del mapa.'
                        : 'Esta ubicacion viene de una sugerencia de Google Places.'
                      : 'Puedes dejarla manual o elegir una sugerencia para validarla.'}
                  </p>
                </div>
              </div>
              <div className="venueAddressPreviewBody">
                <span>{venueForm.address}</span>
                {addressRegionLine ? <small>{addressRegionLine}</small> : null}
                {coordinatesLabel ? <small>Coordenadas: {coordinatesLabel}</small> : null}
              </div>
              {googleMapsUrl ? (
                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="venueAddressMapsLink">
                  Ver en Google Maps
                </a>
              ) : null}
            </div>
          ) : null}

          {mapError ? (
            <div className="venueAddressFeedback error" role="alert">
              <AlertCircle size={16} />
              <span>{mapError}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
