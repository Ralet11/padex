import React, { useCallback, useEffect } from 'react';
import PartnerOperationsLayout from '../PartnerOperationsLayout';
import AgendaWorkspace from '../components/AgendaWorkspace';
import AvailabilityBuilderModal from '../components/AvailabilityBuilderModal';
import BookingModal from '../components/BookingModal';
import DayOverrideModal from '../components/DayOverrideModal';
import { useAgendaData } from '../hooks/useAgendaData';
import { useExceptionsData } from '../hooks/useExceptionsData';
import { useOperationsVenue } from '../hooks/useOperationsVenue';

export default function AgendaPage(props) {
  const { venue, onLogout, onRefresh, error } = props;
  const venueState = useOperationsVenue({ venue, error, onRefresh });
  const agenda = useAgendaData({ venueId: venueState.venue?.id, courts: venueState.courts, includeRules: true });
  const exceptions = useExceptionsData({
    venueId: venueState.venue?.id,
    courts: venueState.courts,
    viewRange: agenda.viewRange,
    planningTo: agenda.planningForm.to,
  });
  const { setSelectedDate } = exceptions;

  useEffect(() => {
    setSelectedDate(agenda.selectedAgendaDate);
  }, [agenda.selectedAgendaDate, setSelectedDate]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      venueState.refreshVenue(),
      agenda.refreshAgenda(),
      exceptions.refreshExceptions(),
    ]);
  }, [agenda, exceptions, venueState]);

  return (
    <PartnerOperationsLayout
      venue={venueState.venue}
      sectionLabel="Agenda"
      title="Agenda operativa"
      description={null}
      onLogout={onLogout}
      onRefresh={handleRefresh}
      isRefreshing={venueState.isRefreshingVenue}
      error={agenda.slotsError || exceptions.exceptionsError || venueState.venueError}
      compactHeader
    >
      <AgendaWorkspace courts={venueState.courts} agenda={agenda} exceptions={exceptions} />

      <AvailabilityBuilderModal
        open={agenda.showAvailabilityBuilder}
        courts={venueState.courts}
        planningForm={agenda.planningForm}
        setPlanningForm={agenda.setPlanningForm}
        isGeneratingSlots={agenda.isGeneratingSlots}
        toggleCourt={agenda.toggleCourt}
        toggleRuleWeekday={agenda.toggleRuleWeekday}
        addRule={agenda.addRule}
        removeRule={agenda.removeRule}
        addTimeWindow={agenda.addTimeWindow}
        updateTimeWindow={agenda.updateTimeWindow}
        removeTimeWindow={agenda.removeTimeWindow}
        onClose={() => agenda.setShowAvailabilityBuilder(false)}
        onSubmit={agenda.handleGenerateSlots}
      />

      <BookingModal
        open={agenda.showBookingModal}
        selectedSlot={agenda.selectedSlot}
        bookingForm={agenda.bookingForm}
        setBookingForm={agenda.setBookingForm}
        isSavingBooking={agenda.isSavingBooking}
        formatDateLabel={agenda.formatDateLabel}
        onClose={agenda.closeBookingModal}
        onSubmit={agenda.handleOccupySlot}
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
    </PartnerOperationsLayout>
  );
}
