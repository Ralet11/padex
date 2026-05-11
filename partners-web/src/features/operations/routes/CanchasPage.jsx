import React, { useCallback } from 'react';
import PartnerOperationsLayout from '../PartnerOperationsLayout';
import CourtClosureModal from '../components/CourtClosureModal';
import CourtEditorModal from '../components/CourtEditorModal';
import CourtsWorkspace from '../components/CourtsWorkspace';
import { useAgendaData } from '../hooks/useAgendaData';
import { useCourtsData } from '../hooks/useCourtsData';
import { useExceptionsData } from '../hooks/useExceptionsData';
import { useOperationsVenue } from '../hooks/useOperationsVenue';

export default function CanchasPage(props) {
  const { venue, onLogout, onRefresh, error } = props;
  const venueState = useOperationsVenue({ venue, error, onRefresh });
  const agenda = useAgendaData({ venueId: venueState.venue?.id, courts: venueState.courts, includeRules: false });
  const exceptions = useExceptionsData({
    venueId: venueState.venue?.id,
    courts: venueState.courts,
    viewRange: agenda.viewRange,
    planningTo: agenda.viewRange.to,
  });
  const courtsData = useCourtsData({
    courts: venueState.courts,
    slotsByCourt: agenda.slotsByCourt,
    closuresByCourt: exceptions.closuresByCourt,
    onVenueRefresh: venueState.refreshVenue,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      venueState.refreshVenue(),
      agenda.fetchSlots(),
      exceptions.refreshExceptions(),
    ]);
  }, [agenda, exceptions, venueState]);

  return (
    <PartnerOperationsLayout
      venue={venueState.venue}
      sectionLabel="Canchas"
      title="Inventario operativo"
      description="El roster de canchas ya no depende del tab shell viejo: usa datos compartidos de slots, cierres y metadata de inventario."
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={agenda.slotsError || exceptions.exceptionsError || venueState.venueError}
    >
      <CourtsWorkspace
        courtsData={courtsData}
        formatDateLabel={agenda.formatDateLabel}
        onOpenClosure={exceptions.openCourtClosure}
        onRemoveClosure={async (closureId) => {
          await exceptions.removeCourtClosure(closureId);
          await agenda.fetchSlots();
        }}
        isSavingClosure={exceptions.isSavingClosure}
      />

      <CourtEditorModal
        open={courtsData.showAddCourtModal}
        courtForm={courtsData.courtForm}
        setCourtForm={courtsData.setCourtForm}
        isSavingCourt={courtsData.isSavingCourt}
        onClose={courtsData.closeCourtEditor}
        onSubmit={courtsData.handleSaveCourt}
      />

      <CourtClosureModal
        open={exceptions.showCourtClosureModal}
        selectedClosureCourt={exceptions.selectedClosureCourt}
        courtClosureForm={exceptions.courtClosureForm}
        setCourtClosureForm={exceptions.setCourtClosureForm}
        isSavingClosure={exceptions.isSavingClosure}
        onClose={() => exceptions.setShowCourtClosureModal(false)}
        onSubmit={async () => {
          await exceptions.saveCourtClosure();
          await agenda.fetchSlots();
        }}
      />
    </PartnerOperationsLayout>
  );
}
