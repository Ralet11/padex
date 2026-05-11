import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import PartnerOperationsLayout from '../PartnerOperationsLayout';
import VenueSettingsWorkspace from '../components/VenueSettingsWorkspace';
import { useOperationsVenue } from '../hooks/useOperationsVenue';
import { useVenueSettings } from '../hooks/useVenueSettings';

export default function SedePage(props) {
  const { venue, onLogout, onRefresh, error } = props;
  const venueState = useOperationsVenue({ venue, error, onRefresh });
  const settings = useVenueSettings({ venue: venueState.venue, onVenueRefresh: venueState.refreshVenue });
  const handleRefresh = useCallback(async () => {
    await venueState.refreshVenue();
  }, [venueState]);

  return (
    <PartnerOperationsLayout
      venue={venueState.venue}
      sectionLabel="Sede"
      title="Identidad y configuración"
      description="Esta superficie concentra datos comerciales y estáticos del club, dejando la operación diaria en Hoy, Agenda y Excepciones."
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={venueState.venueError}
      actions={(
        <div className="operationsQuickLinks">
          <Link className="btn-outline compact" to="/operations/hoy">Volver a Hoy</Link>
          <Link className="btn-outline compact" to="/operations/agenda">Ir a Agenda</Link>
        </div>
      )}
    >
      <VenueSettingsWorkspace settings={settings} />
    </PartnerOperationsLayout>
  );
}
