import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { BASE_URL, courtsAPI, matchesAPI } from '../../services/api';
import { getSocket, joinVenueAvailability, leaveVenueAvailability } from '../../services/socket';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { screenPadding } from '../../theme/layout';
import { RANK_ARRAY, getRankByTier } from '../../utils/rankings';

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toAbsoluteImage(uri) {
  if (!uri) return null;
  if (uri.startsWith('http')) return uri;
  return `${BASE_URL}${uri}`;
}

function getPlayerPrice(totalCourtPrice, orderIndex) {
  const basePrice = Number(totalCourtPrice || 0) / 4;
  return Math.round(basePrice + (orderIndex * 2000));
}

export default function CreateMatchScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [activeVenue, setActiveVenue] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dateSummaries, setDateSummaries] = useState([]);
  const [selectedDateSummary, setSelectedDateSummary] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [categoryRule, setCategoryRule] = useState({
    open_category: true,
    min_category_tier: 4,
    max_category_tier: 7,
  });
  const [venueSearch, setVenueSearch] = useState('');
  const [weekPickerVisible, setWeekPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [searchingNextDate, setSearchingNextDate] = useState(false);

  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (weekOffset * 7) + i);
    return {
      value: formatLocalDate(d),
      label: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }),
      isToday: weekOffset === 0 && i === 0,
    };
  }), [weekOffset]);

  const currentWeekLabel = useMemo(() => {
    const first = dates[0];
    const last = dates[dates.length - 1];
    if (!first || !last) return '';

    const firstDate = new Date(`${first.value}T00:00:00`);
    const lastDate = new Date(`${last.value}T00:00:00`);
    const firstText = firstDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const lastText = lastDate.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

    return `${firstText} - ${lastText}`;
  }, [dates]);

  const weekOptions = useMemo(() => Array.from({ length: 16 }, (_, index) => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() + (index * 7));

    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const startText = start.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
    const endText = end.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

    return {
      offset: index,
      label: `${startText} - ${endText}`,
      helper: index === 0 ? 'Esta semana' : `En ${index} semana${index > 1 ? 's' : ''}`,
    };
  }), []);

  const filteredVenues = useMemo(() => {
    const query = venueSearch.trim().toLowerCase();
    if (!query) return venues;

    return venues.filter((venue) => (
      venue.name?.toLowerCase().includes(query)
      || venue.address?.toLowerCase().includes(query)
    ));
  }, [venueSearch, venues]);

  const findFirstAvailableDate = useCallback(async (venueId, startDate) => {
    const startIndex = Math.max(0, dates.findIndex((date) => date.value === startDate));

    for (let i = startIndex; i < dates.length; i += 1) {
      const dateValue = dates[i].value;
      const summary = dateSummaries.find((item) => item.date === dateValue);
      if ((summary?.available_slots || 0) === 0) continue;

      const res = await courtsAPI.venueSlots(venueId, dateValue);
      const candidateSlots = res.data.slots || [];
      if (candidateSlots.length > 0) {
        return {
          date: dateValue,
          slots: candidateSlots,
          summary: res.data.summary || summary || null,
        };
      }
    }

    return null;
  }, [dateSummaries, dates]);

  const openVenueMap = useCallback(async (venue) => {
    const query = [venue?.name, venue?.address].filter(Boolean).join(' ');
    if (!query) {
      Alert.alert('Mapa no disponible', 'Esta sede no tiene direccion cargada.');
      return;
    }

    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error(err);
      Alert.alert('No se pudo abrir el mapa', 'Proba de nuevo en unos segundos.');
    }
  }, []);

  const loadVenues = useCallback(async () => {
    try {
      const res = await courtsAPI.venues();
      setVenues(res.data.venues || []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadDateSummaries = useCallback(async (venueId) => {
    if (!venueId) return;

    try {
      const from = dates[0]?.value;
      const to = dates[dates.length - 1]?.value;
      const res = await courtsAPI.venueAvailabilitySummary(venueId, from, to);
      setDateSummaries(res.data.date_summaries || []);
    } catch (err) {
      console.error(err);
      setDateSummaries([]);
    }
  }, [dates]);

  const fetchSlots = useCallback(async () => {
    if (!selectedVenue || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const res = await courtsAPI.venueSlots(selectedVenue.id, selectedDate);
      const nextSlots = res.data.slots || [];
      setSelectedDateSummary(res.data.summary || null);

      if (Array.isArray(res.data.date_summaries) && res.data.date_summaries.length > 0) {
        setDateSummaries(res.data.date_summaries);
      }

      setSlots(nextSlots);
      setSelectedSlot((currentSelectedSlot) => {
        if (nextSlots.length === 0 || !currentSelectedSlot) return null;

        const stillAvailable = nextSlots.find(
          (slot) => slot.date === currentSelectedSlot.date && slot.time === currentSelectedSlot.time
        );

        return stillAvailable || null;
      });
    } catch (err) {
      console.error(err);
      setSlots([]);
      setSelectedSlot(null);
      setSelectedDateSummary(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [selectedVenue, selectedDate]);

  useEffect(() => {
    loadVenues();
    setSelectedDate(formatLocalDate(new Date()));
  }, [loadVenues]);

  useEffect(() => {
    if (!selectedDate) return;
    const dateExistsInVisibleWeek = dates.some((date) => date.value === selectedDate);
    if (!dateExistsInVisibleWeek) {
      setSelectedDate(dates[0]?.value || '');
    }
  }, [dates, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadVenues();
      if (selectedVenue?.id && selectedDate) {
        fetchSlots();
        loadDateSummaries(selectedVenue.id);
      }
    }, [fetchSlots, loadDateSummaries, loadVenues, selectedDate, selectedVenue?.id])
  );

  useEffect(() => {
    if (!selectedVenue || !selectedDate) return undefined;

    fetchSlots();
    loadDateSummaries(selectedVenue.id);
    joinVenueAvailability(selectedVenue.id, selectedDate);

    const socket = getSocket();
    if (!socket) {
      return () => leaveVenueAvailability(selectedVenue.id, selectedDate);
    }

    const handleAvailabilityUpdate = (payload) => {
      if (payload?.venue_id !== selectedVenue.id) return;
      if (payload?.date && payload.date !== selectedDate) {
        loadDateSummaries(selectedVenue.id);
        return;
      }

      fetchSlots();
      loadDateSummaries(selectedVenue.id);
    };

    const handleReconnect = () => {
      joinVenueAvailability(selectedVenue.id, selectedDate);
      fetchSlots();
      loadDateSummaries(selectedVenue.id);
    };

    socket.on('venue_availability_updated', handleAvailabilityUpdate);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('venue_availability_updated', handleAvailabilityUpdate);
      socket.off('connect', handleReconnect);
      leaveVenueAvailability(selectedVenue.id, selectedDate);
    };
  }, [fetchSlots, loadDateSummaries, selectedVenue, selectedDate]);

  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
    setDateSummaries([]);
    setSelectedDateSummary(null);
  }, [selectedVenue?.id]);

  const handleFindNextAvailableDate = useCallback(async () => {
    if (!selectedVenue || !selectedDate) return;

    setSearchingNextDate(true);
    try {
      const fallback = await findFirstAvailableDate(selectedVenue.id, selectedDate);
      if (!fallback) {
        Alert.alert('Sin turnos', 'No encontramos turnos disponibles en los proximos dias.');
        return;
      }

      setSelectedDate(fallback.date);
      setSlots(fallback.slots);
      setSelectedSlot(fallback.slots[0] || null);
      setSelectedDateSummary(fallback.summary || null);
    } finally {
      setSearchingNextDate(false);
    }
  }, [findFirstAvailableDate, selectedDate, selectedVenue]);

  async function handleCreate() {
    if (!selectedVenue) return Alert.alert('Error', 'Selecciona una sede');
    if (!selectedSlot) return Alert.alert('Error', 'Selecciona un turno');

    setLoading(true);
    try {
      const res = await matchesAPI.create({
        venue_id: selectedVenue.id,
        date: selectedDate,
        time: selectedSlot.time,
        title: form.title || undefined,
        description: form.description || undefined,
        open_category: categoryRule.open_category,
        min_category_tier: categoryRule.open_category ? undefined : categoryRule.min_category_tier,
        max_category_tier: categoryRule.open_category ? undefined : categoryRule.max_category_tier,
      });

      Alert.alert('Partido creado', 'Tu partido ya esta visible en el buscador', [
        {
          text: 'Ver partido',
          onPress: () => navigation.navigate('Home', { screen: 'MatchDetail', params: { matchId: res.data.match.id } }),
        },
        { text: 'Ok', style: 'cancel' },
      ]);
      navigation.navigate('Inicio');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {['Sede', 'Turno', 'Detalles'].map((label, i) => {
        const isActive = step === i + 1;
        const isDone = step > i + 1;

        return (
          <View key={label} style={styles.stepItem}>
            <View style={[
              styles.stepBadge,
              isActive && { backgroundColor: colors.text.primary },
              isDone && { backgroundColor: colors.text.primary },
              !isActive && !isDone && { backgroundColor: colors.surfaceHighlight }
            ]}>
              {isDone ? (
                <Feather name="check" size={12} color={colors.accent} />
              ) : (
                <Text style={[
                  typography.captionMedium,
                  isActive ? { color: colors.accent } : { color: colors.text.secondary }
                ]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text style={[
              typography.captionMedium,
              { marginLeft: 6, marginRight: 8 },
              isActive ? { color: colors.text.primary, fontWeight: '700' } : { color: colors.text.secondary }
            ]}>
              {label}
            </Text>
            {i < 2 && <View style={[styles.stepLine, { backgroundColor: isDone ? colors.text.primary : colors.borderLight }]} />}
          </View>
        );
      })}
    </View>
  );

  const renderActionBar = () => {
    if (step === 1) {
      if (!selectedVenue) return null;

      return (
        <View style={[styles.btnRow, styles.singleActionRow]}>
          <Button
            title="Siguiente"
            onPress={() => {
              if (!selectedVenue) return Alert.alert('Error', 'Selecciona una sede');
              setStep(2);
            }}
            style={styles.primaryActionButton}
            size="md"
            textStyle={styles.primaryActionText}
          />
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.btnRow}>
          <Button title="Atras" onPress={() => setStep(1)} variant="secondary" style={styles.secondaryActionButton} size="md" textStyle={styles.secondaryActionText} />
          <Button
            title="Siguiente"
            onPress={() => {
              if (!selectedSlot) return Alert.alert('Error', 'Selecciona un turno');
              setStep(3);
            }}
            style={styles.primaryActionButton}
            size="md"
            textStyle={styles.primaryActionText}
          />
        </View>
      );
    }

    return (
      <View style={styles.btnRow}>
        <Button title="Atras" onPress={() => setStep(2)} variant="secondary" style={styles.secondaryActionButton} size="md" textStyle={styles.secondaryActionText} />
        <Button title="Confirmar" onPress={handleCreate} loading={loading} style={styles.primaryActionButton} size="md" textStyle={styles.primaryActionText} />
      </View>
    );
  };

  const actionBarBottom = 64 + Math.max(insets.bottom, spacing.xs);
  const shouldShowActionBar = step !== 1 || Boolean(selectedVenue);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.headerContainer}>
        <Text style={[typography.h2, { color: colors.text.primary }]}>Crear Partido</Text>
        <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
          Elegi la sede y el horario. La cancha la asigna el sistema.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {renderStepIndicator()}

        {step === 1 && (
          <View style={styles.venueColumn}>
            <View style={styles.venueSectionHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subtitle, { color: colors.text.primary }]}>Elegi la sede</Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                  Busca rapido y compara ubicacion, canchas y precio base.
                </Text>
              </View>
              <View style={[styles.venueCountChip, { backgroundColor: colors.surfaceHighlight }]}>
                <Text style={[typography.captionMedium, { color: colors.text.primary }]}>
                  {filteredVenues.length} sedes
                </Text>
              </View>
            </View>
            <Input
              label="Buscar sede"
              value={venueSearch}
              onChangeText={setVenueSearch}
              placeholder="Nombre o direccion"
              icon={<Feather name="search" size={16} color={colors.text.tertiary} />}
            />
            {selectedVenue ? (
              <View style={[styles.selectedVenueCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                <View style={styles.selectedVenueHeader}>
                  <View>
                    <Text style={[typography.label, { color: colors.text.tertiary }]}>SEDE ELEGIDA</Text>
                    <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 2 }]}>
                      {selectedVenue.name}
                    </Text>
                  </View>
                  <Feather name="check-circle" size={18} color={colors.accent} />
                </View>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 6 }]} numberOfLines={2}>
                  {selectedVenue.address || 'Direccion no disponible'}
                </Text>
              </View>
            ) : null}
            {filteredVenues.map((venue) => {
              const isSelected = selectedVenue?.id === venue.id;

              return (
                <TouchableOpacity
                  key={venue.id}
                  style={[
                    styles.optionCard,
                    { borderColor: colors.borderLight, backgroundColor: colors.surface },
                    isSelected && { backgroundColor: colors.surfaceHighlight, borderColor: colors.text.primary }
                  ]}
                  onPress={() => setSelectedVenue(venue)}
                  activeOpacity={0.7}
                >
                  {toAbsoluteImage(venue.image) ? (
                    <Image source={{ uri: toAbsoluteImage(venue.image) }} style={styles.optionImage} />
                  ) : (
                    <View style={[styles.optionIcon, { backgroundColor: isSelected ? colors.text.primary : colors.surfaceHighlight }]}>
                      <Feather name="map-pin" size={18} color={isSelected ? colors.accent : colors.text.tertiary} />
                    </View>
                  )}
                  <View style={styles.optionInfo}>
                    <Text style={[typography.label, { color: colors.text.tertiary }]}>SEDE</Text>
                    <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 2 }]}>{venue.name}</Text>
                    <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
                      {venue.address}
                    </Text>
                    <View style={styles.metaRow}>
                      <View style={[styles.metaChip, { backgroundColor: colors.background }]}>
                        <Text style={[typography.caption, { color: colors.text.secondary }]}>
                          {venue.court_count || 0} canchas
                        </Text>
                      </View>
                      {venue.price_per_slot ? (
                        <View style={[styles.metaChip, { backgroundColor: colors.background }]}>
                          <Text style={[typography.caption, { color: colors.text.secondary }]}>
                            Desde ${getPlayerPrice(venue.price_per_slot, 0).toLocaleString('es-AR')}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {venue.phone ? (
                      <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: 2 }]} numberOfLines={1}>
                        {venue.phone}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.optionActions}>
                    <TouchableOpacity
                      onPress={() => setActiveVenue(venue)}
                      style={[styles.infoButton, { borderColor: colors.borderLight, backgroundColor: colors.background }]}
                      activeOpacity={0.75}
                    >
                      <Feather name="info" size={15} color={colors.text.secondary} />
                    </TouchableOpacity>
                    <View style={[styles.selectionPill, { borderColor: isSelected ? colors.text.primary : colors.borderLight, backgroundColor: isSelected ? colors.text.primary : colors.background }]}>
                      <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.secondary }]}>
                        {isSelected ? 'OK' : 'Elegir'}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            {filteredVenues.length === 0 ? (
              <View style={styles.searchEmptyState}>
                <Text style={[typography.caption, { color: colors.text.secondary, textAlign: 'center' }]}>
                  No encontramos sedes con ese nombre.
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[typography.subtitle, { color: colors.text.primary, marginBottom: 2 }]}>Elegi el turno</Text>
            <Text style={[typography.caption, { color: colors.text.secondary, marginBottom: spacing.md }]}>
              {selectedVenue?.name}
            </Text>

            <View style={styles.weekSwitcher}>
              <TouchableOpacity
                style={[
                  styles.weekNavButton,
                  { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight },
                  weekOffset === 0 && { opacity: 0.45 }
                ]}
                onPress={() => {
                  if (weekOffset === 0) return;
                  setWeekOffset((current) => Math.max(0, current - 1));
                }}
                disabled={weekOffset === 0}
              >
                <Feather name="chevron-left" size={16} color={colors.text.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setWeekPickerVisible(true)}
                style={[styles.weekLabelCard, { backgroundColor: colors.surfaceHighlight }]}
              >
                <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>SEMANA</Text>
                <View style={styles.weekLabelRow}>
                  <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 2, flex: 1 }]}>
                    {currentWeekLabel}
                  </Text>
                  <Feather name="chevron-down" size={16} color={colors.text.secondary} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.weekNavButton, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}
                onPress={() => setWeekOffset((current) => current + 1)}
              >
                <Feather name="chevron-right" size={16} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
              {dates.map((d) => {
                const isSelected = selectedDate === d.value;
                const daySummary = dateSummaries.find((item) => item.date === d.value);
                const totalSlots = Number(daySummary?.total_slots || 0);
                const hasAgenda = totalSlots > 0;

                return (
                  <TouchableOpacity
                    key={d.value}
                    style={[
                      styles.dateChip,
                      { borderColor: colors.borderLight },
                      !hasAgenda && { opacity: 0.55 },
                      isSelected && { backgroundColor: colors.text.primary, borderColor: colors.text.primary }
                    ]}
                    onPress={() => setSelectedDate(d.value)}
                  >
                    <Text style={[
                      typography.bodyMedium,
                      { color: isSelected ? colors.accent : colors.text.secondary },
                      isSelected && { fontWeight: '700' }
                    ]}>
                      {d.isToday ? 'Hoy' : d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {loadingSlots ? (
              <Text style={[typography.body, { textAlign: 'center', color: colors.text.tertiary, marginVertical: 40 }]}>
                Cargando turnos...
              </Text>
            ) : slots.length === 0 ? (
              <View style={styles.emptySlotsState}>
                <Text style={[typography.body, { textAlign: 'center', color: colors.text.secondary }]}>
                  No hay turnos libres para este dia
                </Text>
                <Text style={[typography.caption, { textAlign: 'center', color: colors.text.tertiary, marginTop: 6 }]}>
                  {selectedDateSummary?.total_slots > 0
                    ? 'La sede tiene agenda cargada, pero no quedan cupos libres en esta fecha.'
                    : 'Esta sede no tiene agenda cargada para esta fecha.'}
                </Text>
                {selectedDateSummary?.total_slots > 0 ? (
                  <Text style={[typography.captionMedium, { textAlign: 'center', color: colors.text.secondary, marginTop: 8 }]}>
                    {selectedDateSummary.occupied_slots} ocupados · {selectedDateSummary.total_slots} turnos totales
                  </Text>
                ) : null}
                <Button
                  title="Buscar proximo dia libre"
                  variant="outline"
                  loading={searchingNextDate}
                  onPress={handleFindNextAvailableDate}
                  style={{ marginTop: spacing.md, alignSelf: 'stretch' }}
                />
              </View>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.date === slot.date && selectedSlot?.time === slot.time;

                  return (
                    <TouchableOpacity
                      key={`${slot.date}-${slot.time}`}
                      style={[
                        styles.slotCard,
                        { borderColor: colors.borderLight },
                        isSelected && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[typography.bodyBold, { color: isSelected ? colors.accent : colors.text.secondary }]}>
                        {slot.time}
                      </Text>
                      <Text style={[typography.caption, { color: isSelected ? colors.accent : colors.text.tertiary, marginTop: 4 }]}>
                        ${Number(slot.price || 0).toLocaleString('es-AR')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[typography.subtitle, { color: colors.text.primary, marginBottom: spacing.md }]}>Detalles finales</Text>

            <View style={[styles.summaryCard, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}>
              <View style={styles.summaryVenueHeader}>
                {toAbsoluteImage(selectedVenue?.image) ? (
                  <Image source={{ uri: toAbsoluteImage(selectedVenue.image) }} style={styles.summaryVenueImage} />
                ) : (
                  <View style={[styles.summaryVenueImage, styles.summaryVenueFallback, { backgroundColor: colors.background }]}>
                    <Feather name="map-pin" size={16} color={colors.text.secondary} />
                  </View>
                )}
                <View style={styles.summaryVenueInfo}>
                  <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
                    {selectedVenue?.name}
                  </Text>
                  <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]} numberOfLines={2}>
                    {selectedVenue?.address || 'Direccion no disponible'}
                  </Text>
                </View>
              </View>

              <View style={styles.summaryRow}>
                <Feather name="calendar" size={14} color={colors.text.tertiary} />
                <Text style={[typography.bodyMedium, { color: colors.text.primary, marginLeft: 8 }]}>
                  {selectedDate} · {selectedSlot?.time}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="dollar-sign" size={14} color={colors.text.tertiary} />
                <Text style={[typography.bodyMedium, { color: colors.text.primary, marginLeft: 8 }]}>
                  Tu precio: ${getPlayerPrice(selectedSlot?.price, 0).toLocaleString('es-AR')}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="shuffle" size={14} color={colors.text.tertiary} />
                <Text style={[typography.bodyMedium, { color: colors.text.primary, marginLeft: 8 }]}>
                  La cancha se asigna automaticamente
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Feather name="sliders" size={14} color={colors.text.tertiary} />
                <Text style={[typography.bodyMedium, { color: colors.text.primary, marginLeft: 8 }]}>
                  {categoryRule.open_category
                    ? 'Nivel libre'
                    : `De ${getRankByTier(categoryRule.max_category_tier).name.split(' ')[0]} a ${getRankByTier(categoryRule.min_category_tier).name.split(' ')[0]}`}
                </Text>
              </View>
            </View>

            <Input
              label="Titulo (opcional)"
              value={form.title}
              onChangeText={(v) => setForm((prev) => ({ ...prev, title: v }))}
              placeholder="Ej: Partido amistoso tarde"
              icon={<Feather name="type" size={18} color={colors.text.tertiary} />}
            />
            <Input
              label="Descripcion (opcional)"
              value={form.description}
              onChangeText={(v) => setForm((prev) => ({ ...prev, description: v }))}
              placeholder="Nivel requerido, observaciones..."
              multiline
              numberOfLines={3}
              icon={<Feather name="align-left" size={18} color={colors.text.tertiary} />}
            />

            <View style={styles.categoryRuleSection}>
              <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: spacing.sm }]}>
                Nivel del partido
              </Text>

              <View style={[styles.ruleModeSwitch, { backgroundColor: colors.surfaceHighlight }]}>
                <TouchableOpacity
                  style={[
                    styles.ruleModeButton,
                    categoryRule.open_category && { backgroundColor: colors.text.primary }
                  ]}
                  onPress={() => setCategoryRule((current) => ({ ...current, open_category: true }))}
                >
                  <Text style={[typography.captionMedium, { color: categoryRule.open_category ? colors.accent : colors.text.secondary }]}>
                    Libre
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ruleModeButton,
                    !categoryRule.open_category && { backgroundColor: colors.text.primary }
                  ]}
                  onPress={() => setCategoryRule((current) => ({ ...current, open_category: false }))}
                >
                  <Text style={[typography.captionMedium, { color: !categoryRule.open_category ? colors.accent : colors.text.secondary }]}>
                    Rango
                  </Text>
                </TouchableOpacity>
              </View>

              {!categoryRule.open_category ? (
                <>
                  <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                    Desde
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rankPickerScroll}>
                    {RANK_ARRAY.map((rank) => {
                      const isSelected = categoryRule.max_category_tier === rank.id;

                      return (
                        <TouchableOpacity
                          key={`from-${rank.id}`}
                          style={[
                            styles.rankChip,
                            { borderColor: colors.borderLight, backgroundColor: colors.surface },
                            isSelected && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                          ]}
                          onPress={() => setCategoryRule((current) => ({
                            ...current,
                            max_category_tier: rank.id,
                            min_category_tier: Math.min(current.min_category_tier, rank.id),
                          }))}
                        >
                          <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.primary }]}>
                            {rank.name.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.sm, marginBottom: spacing.xs }]}>
                    Hasta
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rankPickerScroll}>
                    {RANK_ARRAY.slice().reverse().map((rank) => {
                      const isSelected = categoryRule.min_category_tier === rank.id;

                      return (
                        <TouchableOpacity
                          key={`to-${rank.id}`}
                          style={[
                            styles.rankChip,
                            { borderColor: colors.borderLight, backgroundColor: colors.surface },
                            isSelected && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                          ]}
                          onPress={() => setCategoryRule((current) => ({
                            ...current,
                            min_category_tier: rank.id,
                            max_category_tier: Math.max(current.max_category_tier, rank.id),
                          }))}
                        >
                          <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.primary }]}>
                            {rank.name.split(' ')[0]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </>
              ) : (
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: spacing.sm }]}>
                  Se puede anotar cualquier categoria.
                </Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {shouldShowActionBar ? (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.actionBarBackdrop,
              {
                backgroundColor: colors.background,
                borderColor: colors.borderLight,
                height: actionBarBottom + 72,
              }
            ]}
          />

          <View
            style={[
              styles.actionBar,
              {
                bottom: actionBarBottom,
                backgroundColor: colors.background,
                borderColor: colors.borderLight,
              }
            ]}
          >
            {renderActionBar()}
          </View>
        </>
      ) : null}

      <Modal
        visible={weekPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setWeekPickerVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setWeekPickerVisible(false)}
          />
          <View style={[styles.weekPickerCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <View style={styles.weekPickerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subtitle, { color: colors.text.primary }]}>Elegi una semana</Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                  Salta directo a cualquier semana futura.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setWeekPickerVisible(false)} style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}>
                <Feather name="x" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.weekOptionsList}>
              {weekOptions.map((option) => {
                const isSelected = option.offset === weekOffset;

                return (
                  <TouchableOpacity
                    key={option.offset}
                    style={[
                      styles.weekOptionRow,
                      { borderColor: colors.borderLight, backgroundColor: colors.surface },
                      isSelected && { borderColor: colors.text.primary, backgroundColor: colors.surfaceHighlight }
                    ]}
                    onPress={() => {
                      setWeekOffset(option.offset);
                      setWeekPickerVisible(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{option.label}</Text>
                      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>{option.helper}</Text>
                    </View>
                    {isSelected ? <Feather name="check" size={16} color={colors.accent} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(activeVenue)}
        transparent
        animationType="slide"
        onRequestClose={() => setActiveVenue(null)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setActiveVenue(null)}
          />
          <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
            {toAbsoluteImage(activeVenue?.image) ? (
              <Image source={{ uri: toAbsoluteImage(activeVenue.image) }} style={styles.modalImage} />
            ) : (
              <View style={[styles.modalImage, styles.modalImageFallback, { backgroundColor: colors.surfaceHighlight }]}>
                <Feather name="map-pin" size={28} color={colors.text.secondary} />
              </View>
            )}

            <View style={styles.modalBody}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h3, { color: colors.text.primary }]}>{activeVenue?.name}</Text>
                  <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]}>
                    {activeVenue?.address || 'Direccion no disponible'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setActiveVenue(null)} style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}>
                  <Feather name="x" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.detailsGrid}>
                <View style={[styles.detailChip, { backgroundColor: colors.surfaceHighlight }]}>
                  <Feather name="grid" size={14} color={colors.text.secondary} />
                  <Text style={[typography.captionMedium, { color: colors.text.primary, marginLeft: 8 }]}>
                    {activeVenue?.court_count || 0} canchas
                  </Text>
                </View>
                {activeVenue?.phone ? (
                  <View style={[styles.detailChip, { backgroundColor: colors.surfaceHighlight }]}>
                    <Feather name="phone" size={14} color={colors.text.secondary} />
                    <Text style={[typography.captionMedium, { color: colors.text.primary, marginLeft: 8 }]} numberOfLines={1}>
                      {activeVenue.phone}
                    </Text>
                  </View>
                ) : null}
                {activeVenue?.price_per_slot ? (
                  <View style={[styles.detailChip, { backgroundColor: colors.surfaceHighlight }]}>
                    <Feather name="dollar-sign" size={14} color={colors.text.secondary} />
                    <Text style={[typography.captionMedium, { color: colors.text.primary, marginLeft: 8 }]}>
                      Desde ${getPlayerPrice(activeVenue.price_per_slot, 0).toLocaleString('es-AR')}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Abrir mapa"
                  variant="outline"
                  style={{ flex: 1 }}
                  onPress={() => openVenueMap(activeVenue)}
                />
                <Button
                  title="Seleccionar"
                  variant="accent"
                  style={{ flex: 1 }}
                  onPress={() => {
                    setSelectedVenue(activeVenue);
                    setActiveVenue(null);
                  }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingBottom: 220 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 24, height: 1, marginRight: 8 },
  venueColumn: {
    width: '94%',
    alignSelf: 'center',
  },
  venueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  venueCountChip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedVenueCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  selectedVenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionImage: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    marginRight: 12,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionInfo: { flex: 1 },
  optionActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    paddingLeft: 10,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaChip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectionPill: {
    minWidth: 54,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  weekSwitcher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  weekNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabelCard: {
    flex: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  weekLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateScroll: { marginBottom: spacing.md },
  dateChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
    marginRight: 8,
  },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  emptySlotsState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  slotCard: {
    width: '31%',
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryCard: {
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    gap: 10,
  },
  summaryVenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  summaryVenueImage: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
  },
  summaryVenueFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryVenueInfo: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  categoryRuleSection: {
    marginTop: spacing.sm,
  },
  ruleModeSwitch: {
    flexDirection: 'row',
    borderRadius: radius.full,
    padding: 4,
    gap: 4,
  },
  ruleModeButton: {
    flex: 1,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  rankPickerScroll: {
    marginBottom: spacing.xs,
  },
  rankChip: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginRight: spacing.sm,
  },
  searchEmptyState: {
    paddingVertical: spacing.lg,
  },
  actionBarBackdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  actionBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
  },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  singleActionRow: {
    justifyContent: 'center',
  },
  primaryActionButton: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: '68%',
    alignSelf: 'center',
  },
  secondaryActionButton: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: '38%',
  },
  primaryActionText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  secondaryActionText: {
    ...typography.bodyBold,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  weekPickerCard: {
    maxHeight: '68%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: spacing.lg,
  },
  weekPickerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  weekOptionsList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  weekOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  modalImage: {
    width: '100%',
    height: 180,
  },
  modalImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsGrid: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
