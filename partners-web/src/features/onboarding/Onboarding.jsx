import React, { useEffect, useRef, useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronRight,
  LoaderCircle,
  Lock,
  MapPin,
  Phone,
  Shield,
} from 'lucide-react';
import { api } from '../../lib/runtime';
import {
  buildGoogleMapsSearchUrl,
  extractAddressMetadata,
  loadGoogleMapsPlaces,
} from './googlePlaces';

const TOTAL_STEPS = 4;
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

const Input = ({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  hint = '',
  ...inputProps
}) => (
  <div className="input-group">
    <label>{label}</label>
    <div className="input-wrapper">
      {Icon ? <Icon size={18} className="input-icon" /> : null}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        {...inputProps}
      />
    </div>
    {hint ? <p className="field-hint">{hint}</p> : null}
  </div>
);

const AddressAutocompleteInput = ({
  value,
  onChange,
  onPlaceSelected,
  mapsStatus,
  isConfirmed,
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);

  useEffect(() => {
    onPlaceSelectedRef.current = onPlaceSelected;
  }, [onPlaceSelected]);

  useEffect(() => {
    if (mapsStatus !== 'ready' || !inputRef.current || autocompleteRef.current || !window.google?.maps?.places) {
      return undefined;
    }

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ['formatted_address', 'geometry', 'place_id', 'address_components', 'name'],
    });

    autocompleteRef.current = autocomplete;

    const listener = autocomplete.addListener('place_changed', () => {
      onPlaceSelectedRef.current(autocomplete.getPlace());
    });

    return () => {
      listener?.remove?.();
      if (window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
      autocompleteRef.current = null;
    };
  }, [mapsStatus]);

  return (
    <div className="input-group">
      <label>Direccion exacta</label>
      <div className="input-wrapper has-statusIcon">
        <MapPin size={18} className="input-icon" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Busca la calle, altura o nombre del club"
          autoComplete="street-address"
        />
        {mapsStatus === 'loading' ? (
          <LoaderCircle size={18} className="input-statusIcon spinning" />
        ) : null}
        {mapsStatus === 'ready' && isConfirmed ? (
          <Check size={18} className="input-statusIcon status-success" />
        ) : null}
      </div>
    </div>
  );
};

const MapLocationPicker = ({
  mapsStatus,
  location,
  hasConfirmedAddress,
  onLocationConfirmed,
}) => {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const geocoderRef = useRef(null);
  const onLocationConfirmedRef = useRef(onLocationConfirmed);
  const [mapError, setMapError] = useState('');
  const [isResolvingLocation, setIsResolvingLocation] = useState(false);

  useEffect(() => {
    onLocationConfirmedRef.current = onLocationConfirmed;
  }, [onLocationConfirmed]);

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
        map.setZoom(FOCUSED_MAP_ZOOM);
        onLocationConfirmedRef.current(geocodedPlace, selectionMode);
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
  }, [mapsStatus]);

  useEffect(() => {
    if (mapsStatus !== 'ready' || !mapRef.current || !markerRef.current) {
      return;
    }

    const nextLocation = getLocationLiteral(location?.lat, location?.lng);

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
  }, [location?.lat, location?.lng, mapsStatus]);

  if (mapsStatus !== 'ready') {
    return null;
  }

  return (
    <div className={`map-picker ${hasConfirmedAddress ? 'confirmed' : ''}`}>
      <div className="map-pickerHeader">
        <div>
          <strong>Mapa de precision</strong>
          <p>Haz click en el mapa o arrastra el pin para corregir la ubicacion exacta de la sede.</p>
        </div>
      </div>

      <div className="map-canvasWrapper">
        <div ref={mapElementRef} className="map-canvas" />
        {isResolvingLocation ? (
          <div className="map-overlay">
            <LoaderCircle size={18} className="spinning" />
            <span>Actualizando direccion desde el mapa...</span>
          </div>
        ) : null}
      </div>

      <div className="map-pickerFooter">
        <span>{hasConfirmedAddress ? 'Pin activo y direccion validada.' : 'Aun no hay una ubicacion confirmada.'}</span>
        <span>{hasConfirmedAddress ? 'Puedes ajustarla en el mapa cuantas veces quieras.' : 'Empieza buscando una direccion o marca el punto manualmente.'}</span>
      </div>

      {mapError ? (
        <div className="error-banner map-error" role="alert">
          <AlertCircle size={16} />
          <span>{mapError}</span>
        </div>
      ) : null}
    </div>
  );
};

function getAddressStatusCopy(status) {
  switch (status) {
    case 'loading':
      return {
        tone: 'neutral',
        title: 'Cargando Google Places',
        message: 'En unos segundos vas a poder elegir una direccion sugerida por Google Maps.',
      };
    case 'ready':
      return {
        tone: 'success',
        title: 'Busqueda lista',
        message: 'Escribe la direccion, selecciona una sugerencia y luego ajusta el pin en el mapa si necesitas afinarla.',
      };
    case 'missing-key':
      return {
        tone: 'warning',
        title: 'Falta la API key',
        message: 'Configura VITE_GOOGLE_MAPS_API_KEY para habilitar Google Places. Mientras tanto puedes escribir la direccion manualmente.',
      };
    default:
      return {
        tone: 'warning',
        title: 'No se pudo cargar Google Places',
        message: 'Puedes seguir con carga manual, pero conviene revisar la key o la conexion para validar la direccion.',
      };
  }
}

function getStepValidationMessage(step, formData, mapsStatus) {
  if (step === 1) {
    if (!formData.venue_name.trim()) return 'Ingresa el nombre de la sede.';

    const courtCount = Number.parseInt(formData.court_count, 10);
    if (!Number.isInteger(courtCount) || courtCount < 1) {
      return 'Indica al menos 1 cancha.';
    }

    return '';
  }

  if (step === 2) {
    if (!formData.venue_address.trim()) return 'Busca o escribe la direccion de la sede.';
    if (GOOGLE_MAPS_API_KEY && mapsStatus === 'loading') {
      return 'Espera a que Google Places termine de cargar.';
    }
    if (mapsStatus === 'ready' && !formData.venue_address_place_id) {
      return 'Selecciona una direccion sugerida por Google Places para confirmarla.';
    }

    return '';
  }

  if (step === 3) {
    if (!formData.newPassword) return 'Define una nueva contrasena.';
    if (formData.newPassword.length < 8) {
      return 'La contrasena debe tener al menos 8 caracteres.';
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return 'Las contrasenas no coinciden.';
    }

    return '';
  }

  return '';
}

const Onboarding = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [stepError, setStepError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapsStatus, setMapsStatus] = useState(GOOGLE_MAPS_API_KEY ? 'loading' : 'missing-key');
  const [formData, setFormData] = useState({
    venue_name: '',
    venue_address: '',
    venue_address_place_id: '',
    venue_address_locality: '',
    venue_address_region: '',
    venue_address_country: '',
    venue_address_lat: null,
    venue_address_lng: null,
    venue_address_selection_mode: '',
    venue_phone: '',
    court_count: '1',
    newPassword: '',
    confirmPassword: '',
  });

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

  const nextStep = () => setStep((currentStep) => currentStep + 1);
  const prevStep = () => setStep((currentStep) => currentStep - 1);

  const updateFields = (patch) => {
    setStepError('');
    setFormData((previous) => ({ ...previous, ...patch }));
  };

  const updateField = (field, value) => {
    updateFields({ [field]: value });
  };

  const handleAddressChange = (value) => {
    setStepError('');
    setFormData((previous) => {
      if (value === previous.venue_address) {
        return previous;
      }

      return {
        ...previous,
        venue_address: value,
        venue_address_place_id: '',
        venue_address_locality: '',
        venue_address_region: '',
        venue_address_country: '',
        venue_address_lat: null,
        venue_address_lng: null,
        venue_address_selection_mode: '',
      };
    });
  };

  const handlePlaceSelected = (place, selectionMode = 'places') => {
    const metadata = extractAddressMetadata(place);

    if (!metadata.formattedAddress) {
      return;
    }

    updateFields({
      venue_address: metadata.formattedAddress,
      venue_address_place_id: metadata.placeId,
      venue_address_locality: metadata.locality,
      venue_address_region: metadata.region,
      venue_address_country: metadata.country,
      venue_address_lat: metadata.lat,
      venue_address_lng: metadata.lng,
      venue_address_selection_mode: selectionMode,
    });
  };

  const handleNext = () => {
    const validationMessage = getStepValidationMessage(step, formData, mapsStatus);

    if (validationMessage) {
      setStepError(validationMessage);
      return;
    }

    nextStep();
  };

  const handleBack = () => {
    setStepError('');
    prevStep();
  };

  const handleSubmit = async () => {
    for (const currentStep of [1, 2, 3]) {
      const validationMessage = getStepValidationMessage(currentStep, formData, mapsStatus);

      if (validationMessage) {
        setStep(currentStep);
        setStepError(validationMessage);
        return;
      }
    }

    setIsSubmitting(true);
    setStepError('');

    try {
      const response = await api.post('/partners/onboarding', {
        venue_name: formData.venue_name,
        venue_address: formData.venue_address,
        venue_phone: formData.venue_phone,
        court_count: formData.court_count,
        newPassword: formData.newPassword,
      });

      onComplete({
        name: response.data.venue.name,
        address: response.data.venue.address,
        court_count: response.data.court_count,
      });
    } catch (error) {
      console.error(error);
      setStepError(error.response?.data?.error || error.message || 'Error al procesar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addressStatus = getAddressStatusCopy(mapsStatus);
  const addressRegionLine = [
    formData.venue_address_locality,
    formData.venue_address_region,
    formData.venue_address_country,
  ]
    .filter(Boolean)
    .join(', ');
  const hasConfirmedAddress = Boolean(formData.venue_address_place_id);
  const googleMapsUrl = hasConfirmedAddress
    ? buildGoogleMapsSearchUrl(formData.venue_address, formData.venue_address_place_id)
    : '';
  const hasConfirmedCoordinates = isFiniteCoordinate(formData.venue_address_lat) && isFiniteCoordinate(formData.venue_address_lng);
  const coordinatesLabel = hasConfirmedCoordinates
    ? `${formData.venue_address_lat.toFixed(6)}, ${formData.venue_address_lng.toFixed(6)}`
    : '';
  const isMapAdjustedAddress =
    formData.venue_address_selection_mode === 'map' || formData.venue_address_selection_mode === 'pin';

  return (
    <div className="onboarding-container">
      <div className={`onboarding-card glass ${step === 2 ? 'is-wide' : ''}`}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}></div>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <Motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-content"
            >
              <span className="step-eyebrow">Paso 1 de 4</span>
              <h2>Configura tu Sede</h2>
              <p className="subtitle">Primero cargamos los datos base del complejo para abrir tu centro operativo.</p>

              <Input
                label="Nombre del Complejo"
                icon={Building2}
                value={formData.venue_name}
                onChange={(value) => updateField('venue_name', value)}
                placeholder="Padel Master Club"
              />
              <div className="grid">
                <Input
                  label="Telefono Sede"
                  icon={Phone}
                  value={formData.venue_phone}
                  onChange={(value) => updateField('venue_phone', value)}
                  placeholder="+54 9 11 ..."
                  type="tel"
                />
                <Input
                  label="Canchas"
                  icon={Check}
                  value={formData.court_count}
                  onChange={(value) => updateField('court_count', value)}
                  placeholder="4"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                />
              </div>

              {stepError ? (
                <div className="error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{stepError}</span>
                </div>
              ) : null}

              <button className="btn-primary" onClick={handleNext}>
                Continuar a Ubicacion <ChevronRight size={18} />
              </button>
            </Motion.div>
          ) : null}

          {step === 2 ? (
            <Motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-content"
            >
              <span className="step-eyebrow">Paso 2 de 4</span>
              <h2>Ubica tu Sede</h2>
              <p className="subtitle">Confirma la direccion y, si hace falta, afina el pin sobre el mapa antes de seguir.</p>

              <div className="location-layout">
                <div className="location-main">
                  <AddressAutocompleteInput
                    value={formData.venue_address}
                    onChange={handleAddressChange}
                    onPlaceSelected={handlePlaceSelected}
                    mapsStatus={mapsStatus}
                    isConfirmed={hasConfirmedAddress}
                  />

                  <MapLocationPicker
                    mapsStatus={mapsStatus}
                    location={{
                      lat: formData.venue_address_lat,
                      lng: formData.venue_address_lng,
                    }}
                    hasConfirmedAddress={hasConfirmedAddress}
                    onLocationConfirmed={handlePlaceSelected}
                  />
                </div>

                <div className="location-side">
                  <div className={`status-banner ${addressStatus.tone}`}>
                    <AlertCircle size={18} />
                    <div>
                      <strong>{addressStatus.title}</strong>
                      <p>{addressStatus.message}</p>
                    </div>
                  </div>

                  {formData.venue_address ? (
                    <div className={`address-preview ${hasConfirmedAddress ? 'confirmed' : 'manual'}`}>
                      <div className="address-previewHeader">
                        <div className="address-previewBadge">
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
                              : 'Puedes seguir escribiendo o elegir una sugerencia para validarla.'}
                          </p>
                        </div>
                      </div>
                      <div className="address-previewBody">
                        <span>{formData.venue_address}</span>
                        {addressRegionLine ? <small>{addressRegionLine}</small> : null}
                        {coordinatesLabel ? <small>Coordenadas: {coordinatesLabel}</small> : null}
                      </div>
                      {googleMapsUrl ? (
                        <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="maps-link">
                          Ver en Google Maps
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {stepError ? (
                    <div className="error-banner" role="alert">
                      <AlertCircle size={16} />
                      <span>{stepError}</span>
                    </div>
                  ) : null}

                  <div className="btn-group location-actions">
                    <button className="btn-secondary" onClick={handleBack}>
                      Atras
                    </button>
                    <button className="btn-primary" onClick={handleNext}>
                      Continuar a Seguridad <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </Motion.div>
          ) : null}

          {step === 3 ? (
            <Motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="step-content"
            >
              <span className="step-eyebrow">Paso 3 de 4</span>
              <h2>Seguridad</h2>
              <p className="subtitle">Como es tu primer ingreso, debes cambiar tu contrasena temporal antes de entrar.</p>

              <Input
                label="Nueva Contrasena"
                icon={Lock}
                value={formData.newPassword}
                onChange={(value) => updateField('newPassword', value)}
                placeholder="********"
                type="password"
              />
              <Input
                label="Confirmar Contrasena"
                icon={Shield}
                value={formData.confirmPassword}
                onChange={(value) => updateField('confirmPassword', value)}
                placeholder="********"
                type="password"
              />

              {stepError ? (
                <div className="error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{stepError}</span>
                </div>
              ) : null}

              <div className="btn-group">
                <button className="btn-secondary" onClick={handleBack}>
                  Atras
                </button>
                <button className="btn-primary" onClick={handleNext}>
                  Revisar Datos <ChevronRight size={18} />
                </button>
              </div>
            </Motion.div>
          ) : null}

          {step === 4 ? (
            <Motion.div
              key="step4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="step-content confirmation"
            >
              <div className="success-icon neon-glow">
                <Check size={48} color="black" />
              </div>
              <span className="step-eyebrow">Paso 4 de 4</span>
              <h2>Tu base operativa esta lista</h2>
              <p className="subtitle">
                Revisa la informacion clave de la sede antes de entrar al inicio operativo con agenda e incidentes.
              </p>

              <div className="resume">
                <div className="resume-item">
                  <span>Sede</span>
                  <strong>{formData.venue_name}</strong>
                </div>
                <div className="resume-item">
                  <span>Direccion</span>
                  <strong>{formData.venue_address}</strong>
                </div>
                <div className="resume-item">
                  <span>Telefono</span>
                  <strong>{formData.venue_phone || 'Sin telefono'}</strong>
                </div>
                <div className="resume-item">
                  <span>Canchas</span>
                  <strong>{formData.court_count}</strong>
                </div>
              </div>

              <div className="resume handoffResume">
                <div className="resume-item">
                  <span>Primer destino</span>
                  <strong>Inicio operativo / Hoy</strong>
                </div>
                <div className="resume-item">
                  <span>Vas a poder hacer</span>
                  <strong>Ver agenda, incidentes y proxima accion</strong>
                </div>
              </div>

              {stepError ? (
                <div className="error-banner" role="alert">
                  <AlertCircle size={16} />
                  <span>{stepError}</span>
                </div>
              ) : null}

              <div className="btn-group">
                <button className="btn-secondary" onClick={handleBack} disabled={isSubmitting}>
                  Atras
                </button>
                <button className="btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <LoaderCircle size={18} className="button-spinner spinning" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      Entrar al centro operativo <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </div>
              <p className="legal-copy">
                Al continuar aceptas las <Link to="/politicas-de-privacidad">politicas de privacidad</Link>.
              </p>
            </Motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            .onboarding-container {
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              background: radial-gradient(circle at top right, #1a1a1c, #09090b);
            }
            .onboarding-card {
              width: 100%;
              max-width: 520px;
              background: rgba(18, 18, 20, 0.82);
              border-radius: 24px;
              padding: 40px;
              position: relative;
              overflow: hidden;
            }
            .onboarding-card.is-wide {
              max-width: 980px;
            }
            .progress-bar {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 4px;
              background: rgba(255, 255, 255, 0.05);
            }
            .progress-fill {
              height: 100%;
              background: var(--primary);
              transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
              box-shadow: 0 0 10px var(--primary);
            }
            .step-content {
              display: flex;
              flex-direction: column;
            }
            .step-eyebrow {
              display: inline-flex;
              width: fit-content;
              margin-bottom: 14px;
              padding: 6px 10px;
              border-radius: 999px;
              background: rgba(192, 255, 0, 0.1);
              color: var(--primary);
              font-size: 0.78rem;
              font-weight: 600;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            }
            .onboarding-card h2 {
              font-size: 1.9rem;
              margin-bottom: 8px;
              font-weight: 700;
              letter-spacing: -0.025em;
            }
            .subtitle {
              color: var(--muted-foreground);
              margin-bottom: 32px;
              font-size: 0.95rem;
              line-height: 1.5;
            }
            .input-group {
              margin-bottom: 24px;
            }
            .onboarding-card label {
              display: block;
              font-size: 0.85rem;
              color: var(--muted-foreground);
              margin-bottom: 8px;
              font-weight: 500;
            }
            .input-wrapper {
              position: relative;
              display: flex;
              align-items: center;
            }
            .input-icon {
              position: absolute;
              left: 16px;
              color: var(--muted-foreground);
            }
            .input-statusIcon {
              position: absolute;
              right: 16px;
              color: var(--muted-foreground);
            }
            .status-success {
              color: var(--primary);
            }
            .onboarding-card input {
              width: 100%;
              background: var(--secondary);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              padding: 14px 16px 14px 48px;
              color: white;
              font-size: 1rem;
              transition: all 0.2s ease;
            }
            .has-statusIcon input {
              padding-right: 48px;
            }
            .onboarding-card input:focus {
              outline: none;
              border-color: var(--primary);
              background: #1a1a1c;
            }
            .field-hint {
              margin-top: 8px;
              color: var(--muted-foreground);
              font-size: 0.82rem;
              line-height: 1.45;
            }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }
            .btn-group {
              display: grid;
              grid-template-columns: auto 1fr;
              gap: 16px;
              margin-top: 12px;
            }
            .location-layout {
              display: grid;
              grid-template-columns: minmax(0, 1.12fr) minmax(300px, 0.88fr);
              gap: 22px;
              align-items: start;
            }
            .location-main,
            .location-side {
              display: flex;
              flex-direction: column;
            }
            .location-main .input-group,
            .location-side .status-banner,
            .location-side .address-preview,
            .location-side .error-banner {
              margin-bottom: 18px;
            }
            .location-actions {
              margin-top: auto;
            }
            .map-picker {
              padding: 18px;
              border-radius: 18px;
              margin-bottom: 0;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .map-picker.confirmed {
              border-color: rgba(192, 255, 0, 0.24);
            }
            .map-pickerHeader strong {
              display: block;
              margin-bottom: 4px;
              font-size: 0.94rem;
            }
            .map-pickerHeader p,
            .map-pickerFooter span {
              color: var(--muted-foreground);
              font-size: 0.84rem;
              line-height: 1.45;
            }
            .map-canvasWrapper {
              position: relative;
              margin: 16px 0 14px;
              border-radius: 16px;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .map-canvas {
              width: 100%;
              height: 220px;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.07));
            }
            .map-overlay {
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              background: rgba(9, 9, 11, 0.62);
              color: white;
              font-size: 0.9rem;
              font-weight: 500;
              backdrop-filter: blur(3px);
            }
            .map-pickerFooter {
              display: flex;
              flex-direction: column;
              gap: 2px;
            }
            .map-error {
              margin-top: 14px;
              margin-bottom: 0;
            }
            .status-banner,
            .error-banner,
            .address-preview {
              border-radius: 18px;
              margin-bottom: 24px;
            }
            .status-banner,
            .error-banner {
              display: flex;
              gap: 12px;
              align-items: flex-start;
              padding: 14px 16px;
            }
            .status-banner strong,
            .error-banner span {
              display: block;
              font-size: 0.92rem;
            }
            .status-banner p {
              margin: 4px 0 0;
              font-size: 0.84rem;
              line-height: 1.45;
              color: rgba(255, 255, 255, 0.78);
            }
            .status-banner.neutral {
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .status-banner.success {
              background: rgba(192, 255, 0, 0.08);
              border: 1px solid rgba(192, 255, 0, 0.25);
            }
            .status-banner.warning,
            .error-banner {
              background: rgba(255, 179, 71, 0.08);
              border: 1px solid rgba(255, 179, 71, 0.22);
            }
            .address-preview {
              padding: 18px;
              background: rgba(255, 255, 255, 0.03);
              border: 1px solid rgba(255, 255, 255, 0.08);
            }
            .address-preview.confirmed {
              border-color: rgba(192, 255, 0, 0.28);
              background: rgba(192, 255, 0, 0.06);
            }
            .address-previewHeader {
              display: flex;
              gap: 12px;
              align-items: flex-start;
              margin-bottom: 14px;
            }
            .address-previewHeader p {
              margin: 4px 0 0;
              color: var(--muted-foreground);
              font-size: 0.84rem;
              line-height: 1.45;
            }
            .address-previewBadge {
              width: 28px;
              height: 28px;
              border-radius: 999px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              background: rgba(255, 255, 255, 0.08);
              color: white;
              flex-shrink: 0;
            }
            .address-previewBody {
              display: flex;
              flex-direction: column;
              gap: 6px;
              margin-bottom: 14px;
            }
            .address-previewBody span {
              color: white;
              font-weight: 600;
              line-height: 1.45;
            }
            .address-previewBody small {
              color: var(--muted-foreground);
              font-size: 0.82rem;
            }
            .maps-link {
              width: fit-content;
              color: var(--primary);
              text-decoration: none;
              font-size: 0.88rem;
              font-weight: 600;
            }
            .maps-link:hover {
              text-decoration: underline;
            }
            .confirmation {
              text-align: center;
            }
            .success-icon {
              width: 80px;
              height: 80px;
              background: rgba(192, 255, 0, 0.1);
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 24px;
            }
            .resume {
              background: rgba(255, 255, 255, 0.03);
              border-radius: var(--radius);
              padding: 20px;
              margin-bottom: 24px;
              text-align: left;
            }
            .resume-item {
              display: flex;
              justify-content: space-between;
              gap: 16px;
              margin-bottom: 12px;
              font-size: 0.9rem;
            }
            .resume-item:last-child {
              margin-bottom: 0;
            }
            .resume-item span {
              color: var(--muted-foreground);
            }
            .resume-item strong {
              text-align: right;
            }
            .button-spinner {
              margin-right: 8px;
            }
            .legal-copy {
              margin-top: 18px;
              color: var(--muted-foreground);
              font-size: 0.82rem;
              line-height: 1.5;
            }
            .legal-copy a {
              color: white;
              text-decoration: underline;
              text-underline-offset: 3px;
            }
            .legal-copy a:hover {
              color: var(--primary);
            }
            .spinning {
              animation: onboarding-spin 0.9s linear infinite;
            }
            .btn-primary:disabled,
            .btn-secondary:disabled {
              opacity: 0.72;
              cursor: not-allowed;
            }
            @keyframes onboarding-spin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
            @media (max-width: 640px) {
              .onboarding-card {
                padding: 28px 22px;
              }
              .onboarding-card.is-wide {
                max-width: 520px;
              }
              .location-layout,
              .grid,
              .btn-group {
                grid-template-columns: 1fr;
              }
              .map-canvas {
                height: 240px;
              }
              .resume-item {
                flex-direction: column;
                align-items: flex-start;
              }
              .resume-item strong {
                text-align: left;
              }
            }
          `,
        }}
      />
    </div>
  );
};

export default Onboarding;
