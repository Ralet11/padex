import React from 'react';
import { DollarSign, Image as ImageIcon, MapPin, Phone } from 'lucide-react';
import { CLUB_SERVICE_OPTIONS, SERVICE_LABELS } from '../../dashboard/venueCatalog';
import { resolveAssetUrl } from '../../../lib/runtime';

export default function VenueSettingsWorkspace({ settings }) {
  const toggleVenueService = (service) => {
    settings.setVenueForm((prev) => ({
      ...prev,
      services: prev.services.includes(service)
        ? prev.services.filter((item) => item !== service)
        : [...prev.services, service],
    }));
  };

  return (
    <section className="venueEditor glass">
      <div className="venuePreview">
        <div className="venueImageFrame">
          {settings.venueForm.image ? <img src={resolveAssetUrl(settings.venueForm.image)} alt={settings.venueForm.name || 'Sede'} /> : <div className="venueImagePlaceholder"><ImageIcon size={28} /></div>}
        </div>
        <label className="uploadButton">
          <input type="file" accept="image/*" onChange={(e) => settings.handleVenueImageSelected(e.target.files?.[0])} />
          {settings.isUploadingVenueImage ? 'Subiendo imagen...' : 'Subir imagen desde archivo'}
        </label>
        <div className="venuePreviewText">
          <h3>{settings.venueForm.name || 'Nombre de sede'}</h3>
          <p><MapPin size={16} />{settings.venueForm.address || 'Sin direccion cargada'}</p>
          <p><Phone size={16} />{settings.venueForm.phone || 'Sin telefono cargado'}</p>
          <p><DollarSign size={16} />${Number(settings.venueForm.price_per_slot || 0).toLocaleString('es-AR')} por turno</p>
          <div className="servicePreviewWrap">
            {(settings.venueForm.services || []).length > 0 ? settings.venueForm.services.map((service) => (
              <span key={service} className="servicePreviewChip">{SERVICE_LABELS[service] || service}</span>
            )) : <span className="servicePreviewEmpty">Sin servicios configurados</span>}
          </div>
        </div>
      </div>

      <div className="venueFormGrid">
        <label><span>Nombre comercial</span><input type="text" value={settings.venueForm.name} onChange={(e) => settings.setVenueForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Ej: Padex Centro" /></label>
        <label><span>Telefono</span><input type="text" value={settings.venueForm.phone} onChange={(e) => settings.setVenueForm((prev) => ({ ...prev, phone: e.target.value }))} placeholder="+54 9 ..." /></label>
        <label className="wideField"><span>Direccion</span><input type="text" value={settings.venueForm.address} onChange={(e) => settings.setVenueForm((prev) => ({ ...prev, address: e.target.value }))} placeholder="Ej: Santa Fe 435" /></label>
        <label><span>Precio general por turno</span><input type="number" min="0" step="100" value={settings.venueForm.price_per_slot} onChange={(e) => settings.setVenueForm((prev) => ({ ...prev, price_per_slot: e.target.value }))} placeholder="Ej: 12000" /></label>
        <label className="wideField"><span>Imagen actual</span><input type="text" value={settings.venueForm.image} onChange={(e) => settings.setVenueForm((prev) => ({ ...prev, image: e.target.value }))} placeholder="/uploads/..." /></label>
        <div className="wideField serviceSection">
          <span>Servicios del club</span>
          <div className="optionPillWrap">
            {CLUB_SERVICE_OPTIONS.map((option) => (
              <button key={option.value} type="button" className={`optionPill ${settings.venueForm.services.includes(option.value) ? 'active' : ''}`} onClick={() => toggleVenueService(option.value)}>
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="venueActions">
        <button className="btn-secondary" onClick={settings.resetVenueForm} disabled={settings.isSavingVenue}>Restablecer</button>
        <button className="btn-primary-sm" onClick={settings.handleSaveVenue} disabled={settings.isSavingVenue}>{settings.isSavingVenue ? 'Guardando...' : 'Guardar sede'}</button>
      </div>
    </section>
  );
}
