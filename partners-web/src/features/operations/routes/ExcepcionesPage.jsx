import React, { useCallback } from 'react';
import PartnerOperationsLayout from '../PartnerOperationsLayout';
import CourtClosureModal from '../components/CourtClosureModal';
import DayOverrideModal from '../components/DayOverrideModal';
import ExceptionsWorkspace from '../components/ExceptionsWorkspace';
import { useAgendaData } from '../hooks/useAgendaData';
import { useExceptionsData } from '../hooks/useExceptionsData';
import { useOperationsVenue } from '../hooks/useOperationsVenue';

export default function ExcepcionesPage(props) {
  const { venue, onLogout, onRefresh, error } = props;
  const venueState = useOperationsVenue({ venue, error, onRefresh });
  const agenda = useAgendaData({ venueId: venueState.venue?.id, courts: venueState.courts, includeRules: false });
  const exceptions = useExceptionsData({
    venueId: venueState.venue?.id,
    courts: venueState.courts,
    viewRange: agenda.viewRange,
    planningTo: agenda.viewRange.to,
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      venueState.refreshVenue(),
      agenda.fetchSlots(),
      exceptions.refreshExceptions(),
    ]);
  }, [agenda, exceptions, venueState]);

  const handleSelectedDateChange = useCallback((nextDate) => {
    if (!nextDate) return;
    exceptions.setSelectedDate(nextDate);
    agenda.setSelectedAgendaDate(nextDate);
  }, [agenda, exceptions]);

  return (
    <PartnerOperationsLayout
      venue={venueState.venue}
      sectionLabel="Excepciones"
      title="Excepciones"
      description={null}
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={exceptions.exceptionsError || venueState.venueError}
      compactHeader
    >
      <ExceptionsWorkspace
        courts={venueState.courts}
        exceptions={exceptions}
        formatDateLabel={agenda.formatDateLabel}
        onOpenDayOverride={() => exceptions.openDayOverride(agenda.selectedDaySlots)}
        onOpenClosure={exceptions.openCourtClosure}
        onSelectedDateChange={handleSelectedDateChange}
      />

      <DayOverrideModal
        open={exceptions.showDayOverrideModal}
        selectedDate={exceptions.selectedDate}
        formatDateLabel={agenda.formatDateLabel}
        dayOverrideForm={exceptions.dayOverrideForm}
        isSavingDayOverride={exceptions.isSavingDayOverride}
        hasSelectedDayOverride={Boolean(exceptions.selectedDayOverride)}
        updateDayOverrideWindow={exceptions.updateDayOverrideWindow}
        removeDayOverrideWindow={exceptions.removeDayOverrideWindow}
        addDayOverrideWindow={exceptions.addDayOverrideWindow}
        onClose={() => exceptions.setShowDayOverrideModal(false)}
        onSubmit={async () => {
          await exceptions.saveDayOverride();
          await agenda.fetchSlots();
        }}
        onClear={async () => {
          await exceptions.clearDayOverride();
          await agenda.fetchSlots();
        }}
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
