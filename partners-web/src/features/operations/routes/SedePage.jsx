import React, { useCallback } from 'react';
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
      title="Configuracion de sede"
      description={null}
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={venueState.venueError}
      compactHeader
    >
      <VenueSettingsWorkspace settings={settings} />
    </PartnerOperationsLayout>
  );
}
