import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Image, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { courtsAPI, matchesAPI, resolveAssetUrl } from '../../services/api';
import { getSocket, joinVenueAvailability, leaveVenueAvailability } from '../../services/socket';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { Button, Input, SuccessToast } from '../../components/ui';
import { screenPadding } from '../../theme/layout';
import { RANK_ARRAY, getRankByTier } from '../../utils/rankings';
import {
  CLUB_SERVICE_OPTIONS,
  COURT_ENCLOSURE_OPTIONS,
  COURT_SURFACE_OPTIONS,
  ENCLOSURE_LABELS,
  INITIAL_VENUE_FILTERS,
  SERVICE_LABELS,
  SURFACE_LABELS,
} from '../../constants/venueFilters';

const INITIAL_FORM = { title: '', description: '' };
const INITIAL_CATEGORY_RULE = {
  open_category: true,
  min_category_tier: 4,
  max_category_tier: 7,
};

function createVenueFiltersState() {
  return {
    services: [...INITIAL_VENUE_FILTERS.services],
    surface: INITIAL_VENUE_FILTERS.surface,
    enclosure: INITIAL_VENUE_FILTERS.enclosure,
  };
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getPlayerPrice(totalCourtPrice, orderIndex) {
  const basePrice = Number(totalCourtPrice || 0) / 4;
  return Math.round(basePrice + (orderIndex * 2000));
}

function buildVenueQueryParams(search, filters) {
  const params = {};
  const normalizedSearch = String(search || '').trim();
  if (normalizedSearch) params.q = normalizedSearch;
  if (Array.isArray(filters?.services) && filters.services.length > 0) {
    params.services = filters.services.join(',');
  }
  if (filters?.surface) params.surface = filters.surface;
  if (filters?.enclosure) params.enclosure = filters.enclosure;
  return params;
}

function buildAvailabilityFilters(filters) {
  const params = {};
  if (filters?.surface) params.surface = filters.surface;
  if (filters?.enclosure) params.enclosure = filters.enclosure;
  return params;
}

function countActiveFilters(filters) {
  return (filters?.services?.length || 0) + (filters?.surface ? 1 : 0) + (filters?.enclosure ? 1 : 0);
}

function getAppliedFilterLabels(filters) {
  return [
    ...(filters?.services || []).map((service) => SERVICE_LABELS[service] || service),
    ...(filters?.surface ? [SURFACE_LABELS[filters.surface] || filters.surface] : []),
    ...(filters?.enclosure ? [ENCLOSURE_LABELS[filters.enclosure] || filters.enclosure] : []),
  ];
}

function getCourtCountLabel(venue) {
  const matchingCount = Number(venue?.matching_court_count ?? venue?.court_count ?? 0);
  const totalCount = Number(venue?.total_court_count ?? venue?.court_count ?? 0);

  if (totalCount > 0 && matchingCount >= 0 && matchingCount !== totalCount) {
    return `${matchingCount} de ${totalCount} canchas`;
  }

  return `${matchingCount} canchas`;
}

function getVenueServices(venue) {
  return Array.isArray(venue?.services) ? venue.services : [];
}

function getVenueCourts(venue) {
  return Array.isArray(venue?.courts) ? venue.courts : [];
}

function formatSpecLabel(value) {
  if (!value) return 'Sin especificar';

  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getCourtTypeLabel(type) {
  return formatSpecLabel(type);
}

function getCourtSurfaceLabel(surface) {
  if (!surface) return 'Sin especificar';
  return SURFACE_LABELS[surface] || formatSpecLabel(surface);
}

function getCourtEnclosureLabel(enclosure) {
  if (!enclosure) return 'Sin especificar';
  return ENCLOSURE_LABELS[enclosure] || formatSpecLabel(enclosure);
}

export default function CreateMatchScreen({ navigation }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [venues, setVenues] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [activeVenue, setActiveVenue] = useState(null);
  const [expandedCourtId, setExpandedCourtId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [weekOffset, setWeekOffset] = useState(0);
  const [dateSummaries, setDateSummaries] = useState([]);
  const [selectedDateSummary, setSelectedDateSummary] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [categoryRule, setCategoryRule] = useState(INITIAL_CATEGORY_RULE);
  const [venueSearch, setVenueSearch] = useState('');
  const [venueFilters, setVenueFilters] = useState(() => createVenueFiltersState());
  const [draftVenueFilters, setDraftVenueFilters] = useState(() => createVenueFiltersState());
  const [weekPickerVisible, setWeekPickerVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingVenues, setLoadingVenues] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [searchingNextDate, setSearchingNextDate] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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

  const activeFilterCount = useMemo(() => countActiveFilters(venueFilters), [venueFilters]);
  const activeFilterLabels = useMemo(() => getAppliedFilterLabels(venueFilters), [venueFilters]);
  const venueQueryParams = useMemo(() => buildVenueQueryParams(venueSearch, venueFilters), [venueSearch, venueFilters]);
  const availabilityFilters = useMemo(() => buildAvailabilityFilters(venueFilters), [venueFilters]);
  const selectedVenueId = selectedVenue?.id || null;
  const activeVenueServices = useMemo(() => getVenueServices(activeVenue), [activeVenue]);
  const activeVenueCourts = useMemo(() => getVenueCourts(activeVenue), [activeVenue]);
  const selectedVenueCourt = useMemo(
    () => activeVenueCourts.find((court) => court.id === expandedCourtId) || null,
    [activeVenueCourts, expandedCourtId]
  );

  const findFirstAvailableDate = useCallback(async (venueId, startDate) => {
    const startIndex = Math.max(0, dates.findIndex((date) => date.value === startDate));

    for (let i = startIndex; i < dates.length; i += 1) {
      const dateValue = dates[i].value;
      const summary = dateSummaries.find((item) => item.date === dateValue);
      if ((summary?.available_slots || 0) === 0) continue;

      const res = await courtsAPI.venueSlots(venueId, dateValue, availabilityFilters);
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
  }, [availabilityFilters, dateSummaries, dates]);

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
      Alert.alert('No se pudo abrir el mapa', 'Proba de nuevo en unos segundos.');
    }
  }, []);

  const loadVenues = useCallback(async (params = venueQueryParams) => {
    setLoadingVenues(true);
    try {
      const res = await courtsAPI.venues(params);
      const nextVenues = res.data.venues || [];
      setVenues(nextVenues);
      setSelectedVenue((current) => {
        if (!current) return current;
        return nextVenues.find((venue) => venue.id === current.id) || current;
      });
      setActiveVenue((current) => {
        if (!current) return current;
        return nextVenues.find((venue) => venue.id === current.id) || current;
      });
    } catch (err) {
      setVenues([]);
    } finally {
      setLoadingVenues(false);
    }
  }, [venueQueryParams]);

  const loadDateSummaries = useCallback(async (venueId) => {
    if (!venueId) return;

    try {
      const from = dates[0]?.value;
      const to = dates[dates.length - 1]?.value;
      const res = await courtsAPI.venueAvailabilitySummary(venueId, from, to, availabilityFilters);
      setDateSummaries(res.data.date_summaries || []);
    } catch (err) {
      setDateSummaries([]);
    }
  }, [availabilityFilters, dates]);

  const fetchSlots = useCallback(async () => {
    if (!selectedVenueId || !selectedDate) return;

    setLoadingSlots(true);
    try {
      const res = await courtsAPI.venueSlots(selectedVenueId, selectedDate, availabilityFilters);
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
      setSlots([]);
      setSelectedSlot(null);
      setSelectedDateSummary(null);
    } finally {
      setLoadingSlots(false);
    }
  }, [availabilityFilters, selectedDate, selectedVenueId]);

  useEffect(() => {
    setSelectedDate(formatLocalDate(new Date()));
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadVenues(venueQueryParams);
    }, venueSearch.trim() ? 250 : 0);

    return () => clearTimeout(timeoutId);
  }, [loadVenues, venueQueryParams, venueSearch]);

  useEffect(() => {
    if (!selectedDate) return;
    const dateExistsInVisibleWeek = dates.some((date) => date.value === selectedDate);
    if (!dateExistsInVisibleWeek) {
      setSelectedDate(dates[0]?.value || '');
    }
  }, [dates, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadVenues(venueQueryParams);
      if (selectedVenueId && selectedDate) {
        fetchSlots();
        loadDateSummaries(selectedVenueId);
      }
    }, [fetchSlots, loadDateSummaries, loadVenues, selectedDate, selectedVenueId, venueQueryParams])
  );

  useEffect(() => {
    if (!selectedVenueId || !selectedDate) return undefined;

    fetchSlots();
    loadDateSummaries(selectedVenueId);
    joinVenueAvailability(selectedVenueId, selectedDate);

    const socket = getSocket();
    if (!socket) {
      return () => leaveVenueAvailability(selectedVenueId, selectedDate);
    }

    const handleAvailabilityUpdate = (payload) => {
      if (payload?.venue_id !== selectedVenueId) return;
      if (payload?.date && payload.date !== selectedDate) {
        loadDateSummaries(selectedVenueId);
        return;
      }

      fetchSlots();
      loadDateSummaries(selectedVenueId);
    };

    const handleReconnect = () => {
      joinVenueAvailability(selectedVenueId, selectedDate);
      fetchSlots();
      loadDateSummaries(selectedVenueId);
    };

    socket.on('venue_availability_updated', handleAvailabilityUpdate);
    socket.on('connect', handleReconnect);

    return () => {
      socket.off('venue_availability_updated', handleAvailabilityUpdate);
      socket.off('connect', handleReconnect);
      leaveVenueAvailability(selectedVenueId, selectedDate);
    };
  }, [fetchSlots, loadDateSummaries, selectedDate, selectedVenueId]);

  useEffect(() => {
    setSelectedSlot(null);
    setSlots([]);
    setDateSummaries([]);
    setSelectedDateSummary(null);
  }, [selectedVenueId]);

  useEffect(() => {
    setExpandedCourtId(null);
  }, [activeVenue?.id]);

  const handleFindNextAvailableDate = useCallback(async () => {
    if (!selectedVenueId || !selectedDate) return;

    setSearchingNextDate(true);
    try {
      const fallback = await findFirstAvailableDate(selectedVenueId, selectedDate);
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
  }, [findFirstAvailableDate, selectedDate, selectedVenueId]);

  const clearVenueSelectionState = useCallback(() => {
    setSelectedVenue(null);
    setActiveVenue(null);
    setSelectedSlot(null);
    setSlots([]);
    setDateSummaries([]);
    setSelectedDateSummary(null);
  }, []);

  const openFilters = useCallback(() => {
    setDraftVenueFilters({
      services: [...venueFilters.services],
      surface: venueFilters.surface,
      enclosure: venueFilters.enclosure,
    });
    setFiltersVisible(true);
  }, [venueFilters]);

  const toggleDraftService = useCallback((service) => {
    setDraftVenueFilters((current) => ({
      ...current,
      services: current.services.includes(service)
        ? current.services.filter((item) => item !== service)
        : [...current.services, service],
    }));
  }, []);

  const applyFilters = useCallback(() => {
    setVenueFilters({
      services: [...draftVenueFilters.services],
      surface: draftVenueFilters.surface,
      enclosure: draftVenueFilters.enclosure,
    });
    clearVenueSelectionState();
    setFiltersVisible(false);
  }, [clearVenueSelectionState, draftVenueFilters]);

  const resetCreateMatchFlow = useCallback(() => {
    setStep(1);
    clearVenueSelectionState();
    setSelectedDate(formatLocalDate(new Date()));
    setWeekOffset(0);
    setForm(INITIAL_FORM);
    setCategoryRule(INITIAL_CATEGORY_RULE);
    setVenueSearch('');
    setVenueFilters(createVenueFiltersState());
    setDraftVenueFilters(createVenueFiltersState());
    setWeekPickerVisible(false);
    setFiltersVisible(false);
    setSearchingNextDate(false);
  }, [clearVenueSelectionState]);

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

      const createdMatchId = res.data.match.id;
      resetCreateMatchFlow();

      setToastMessage('Partido creado exitosamente');
      setToastVisible(true);

      setTimeout(() => {
        navigation.navigate('Home', { screen: 'MatchDetail', params: { matchId: createdMatchId } });
      }, 1200);
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
          <Button title="Atras" onPress={() => setStep(1)} variant="outline" style={styles.secondaryActionButton} size="md" textStyle={styles.secondaryActionText} />
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
        <Button title="Atras" onPress={() => setStep(2)} variant="outline" style={styles.secondaryActionButton} size="md" textStyle={styles.secondaryActionText} />
        <Button title="Confirmar" onPress={handleCreate} loading={loading} style={styles.primaryActionButton} size="md" textStyle={styles.primaryActionText} />
      </View>
    );
  };

  const shouldShowFooterActions = step !== 1 || Boolean(selectedVenue);
  const floatingActionBottom = Math.max(insets.bottom, spacing.sm);
  const floatingActionHeight = step === 1 ? 96 : 104;
  const shouldRenderFloatingFade = shouldShowFooterActions && step !== 3;
  const floatingActionFadeHeight = shouldRenderFloatingFade
    ? floatingActionBottom + floatingActionHeight + spacing.lg
    : 0;
  const scrollBottomPadding = shouldShowFooterActions
    ? floatingActionBottom + floatingActionHeight + (step === 3 ? spacing.md : spacing.lg)
    : insets.bottom + spacing.xxl;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextBlock}>
            <Text style={[typography.h2, { color: colors.text.primary }]}>Crear Partido</Text>
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
              Elegi sede, turno y detalles sin perder espacio util.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Inicio')}
            style={[styles.headerCloseButton, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}
            activeOpacity={0.8}
          >
            <Feather name="x" size={18} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: scrollBottomPadding
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderStepIndicator()}

        {step === 1 && (
          <View style={styles.venueColumn}>
            <View style={styles.searchControlsRow}>
              <Input
                label="Buscar sede"
                value={venueSearch}
                onChangeText={setVenueSearch}
                placeholder="Nombre o direccion"
                leftIcon={<Feather name="search" size={16} color={colors.text.tertiary} />}
                style={styles.searchInputWrap}
              />
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={openFilters}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: activeFilterCount > 0 ? colors.text.primary : colors.surface,
                    borderColor: activeFilterCount > 0 ? colors.text.primary : colors.borderLight,
                  }
                ]}
              >
                <View
                  style={[
                    styles.filterIconWrap,
                    {
                      backgroundColor: activeFilterCount > 0 ? 'rgba(167, 206, 41, 0.16)' : colors.surfaceHighlight,
                      borderColor: activeFilterCount > 0 ? 'rgba(167, 206, 41, 0.24)' : colors.borderLight,
                    }
                  ]}
                >
                  <Feather name="sliders" size={16} color={activeFilterCount > 0 ? colors.accent : colors.text.primary} />
                </View>
                <Text style={[styles.filterButtonLabel, { color: activeFilterCount > 0 ? colors.text.inverse : colors.text.primary }]}>
                  Filtros
                </Text>
                {activeFilterCount > 0 ? (
                  <View style={[styles.filterCountBadge, styles.filterCountBadgeInline, { backgroundColor: colors.accent }]}>
                    <Text style={[typography.captionMedium, { color: colors.text.inverse }]}>{activeFilterCount}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {activeFilterLabels.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFiltersStrip}>
                {activeFilterLabels.map((label) => (
                  <View key={label} style={[styles.activeFilterChip, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                    <Text style={[typography.captionMedium, { color: colors.text.primary }]}>{label}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {loadingVenues ? (
              <View style={styles.searchEmptyState}>
                <ActivityIndicator color={colors.text.primary} />
                <Text style={[typography.caption, { color: colors.text.secondary, textAlign: 'center', marginTop: spacing.sm }]}>
                  Buscando sedes...
                </Text>
              </View>
            ) : venues.map((venue) => {
              const isSelected = selectedVenue?.id === venue.id;
              const venueImage = resolveAssetUrl(venue.image);

              return (
                <View
                  key={venue.id}
                  style={[
                    styles.optionCard,
                    { borderColor: colors.borderLight, backgroundColor: colors.surface },
                    isSelected && { backgroundColor: colors.surfaceHighlight, borderColor: colors.text.primary }
                  ]}
                >
                  <View style={styles.optionTopRow}>
                    {venueImage ? (
                      <Image source={{ uri: venueImage }} style={styles.optionImage} resizeMode="cover" />
                    ) : (
                      <View style={[styles.optionImageFallback, { backgroundColor: isSelected ? colors.text.primary : colors.surfaceHighlight }]}>
                        <Feather name="map-pin" size={22} color={isSelected ? colors.accent : colors.text.tertiary} />
                      </View>
                    )}

                    <View style={styles.optionInfo}>
                      <View style={styles.optionTitleRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={[typography.label, { color: colors.text.tertiary }]}>SEDE</Text>
                          <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 2 }]}>{venue.name}</Text>
                        </View>
                        <View style={[styles.selectionDot, { backgroundColor: isSelected ? colors.text.primary : colors.background, borderColor: isSelected ? colors.text.primary : colors.borderLight }]}>
                          <Feather name={isSelected ? 'check' : 'circle'} size={14} color={isSelected ? colors.accent : colors.text.tertiary} />
                        </View>
                      </View>

                      <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 4 }]} numberOfLines={2}>
                        {venue.address || 'Direccion no disponible'}
                      </Text>

                      <View style={styles.metaRow}>
                        <View style={[styles.metaChip, { backgroundColor: colors.background }]}>
                          <Text style={[typography.caption, { color: colors.text.secondary }]}>
                            {getCourtCountLabel(venue)}
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

                      <View style={styles.optionFooterRow}>
                        {venue.phone ? (
                          <Text style={[typography.caption, { color: colors.text.tertiary, flex: 1 }]} numberOfLines={1}>
                            {venue.phone}
                          </Text>
                        ) : (
                          <View style={{ flex: 1 }} />
                        )}

                        <TouchableOpacity
                          onPress={() => setActiveVenue(venue)}
                          style={[styles.detailButton, { borderColor: colors.borderLight, backgroundColor: colors.background }]}
                          activeOpacity={0.75}
                        >
                          <Feather name="info" size={14} color={colors.text.secondary} />
                          <Text style={[typography.captionMedium, { color: colors.text.secondary }]}>Detalle</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.optionBottomRow}>
                    <TouchableOpacity
                      onPress={() => setSelectedVenue((current) => (current?.id === venue.id ? null : venue))}
                      activeOpacity={0.8}
                      style={[
                        styles.selectionPill,
                        {
                          borderColor: isSelected ? colors.text.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.text.primary : colors.background
                        }
                      ]}
                    >
                      <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.secondary }]}>
                        {isSelected ? 'Quitar seleccion' : 'Seleccionar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
            {!loadingVenues && venues.length === 0 ? (
              <View style={styles.searchEmptyState}>
                <Text style={[typography.caption, { color: colors.text.secondary, textAlign: 'center' }]}>
                  {activeFilterCount > 0
                    ? 'No encontramos sedes que cumplan con esos filtros.'
                    : venueSearch.trim()
                      ? 'No encontramos sedes con ese nombre.'
                      : 'Todavia no hay sedes disponibles.'}
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

            {activeFilterLabels.length > 0 ? (
              <View style={styles.stepFilterSummary}>
                {activeFilterLabels.map((label) => (
                  <View key={`step2-${label}`} style={[styles.activeFilterChip, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                    <Text style={[typography.captionMedium, { color: colors.text.primary }]}>{label}</Text>
                  </View>
                ))}
              </View>
            ) : null}

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
                {resolveAssetUrl(selectedVenue?.image) ? (
                  <Image source={{ uri: resolveAssetUrl(selectedVenue.image) }} style={styles.summaryVenueImage} />
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
              leftIcon={<Feather name="type" size={18} color={colors.text.tertiary} />}
            />
            <Input
              label="Descripcion (opcional)"
              value={form.description}
              onChangeText={(v) => setForm((prev) => ({ ...prev, description: v }))}
              placeholder="Nivel requerido, observaciones..."
              multiline
              numberOfLines={3}
              leftIcon={<Feather name="align-left" size={18} color={colors.text.tertiary} />}
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

      {shouldShowFooterActions ? (
        <View pointerEvents="box-none" style={styles.floatingActionPortal}>
          {shouldRenderFloatingFade ? (
            <View
              pointerEvents="none"
              style={[
                styles.floatingActionFade,
                {
                  bottom: 0,
                  height: floatingActionFadeHeight,
                  backgroundColor: colors.background,
                  opacity: 0.96,
                }
              ]}
            />
          ) : null}
          <View
            style={[
              styles.floatingActionShell,
              {
                bottom: floatingActionBottom,
                backgroundColor: colors.background,
                borderColor: colors.borderLight,
              }
            ]}
          >
            {renderActionBar()}
          </View>
        </View>
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
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => setFiltersVisible(false)}
          />
          <View style={[styles.filterSheetCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
            <View style={styles.weekPickerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[typography.subtitle, { color: colors.text.primary }]}>Filtrar sedes</Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>
                  Servicios del club y caracteristicas de cancha.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFiltersVisible(false)} style={[styles.closeButton, { backgroundColor: colors.surfaceHighlight }]}>
                <Feather name="x" size={18} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.filterSheetContent}>
              <View style={styles.filterSection}>
                <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Servicios del club</Text>
                <View style={styles.filterChipWrap}>
                  {CLUB_SERVICE_OPTIONS.map((option) => {
                    const isSelected = draftVenueFilters.services.includes(option.value);
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.82}
                        onPress={() => toggleDraftService(option.value)}
                        style={[
                          styles.filterChip,
                          { borderColor: colors.borderLight, backgroundColor: colors.surface },
                          isSelected && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                        ]}
                      >
                        <Feather name={option.icon} size={14} color={isSelected ? colors.accent : colors.text.secondary} />
                        <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.primary }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Superficie</Text>
                <View style={styles.filterChipWrap}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setDraftVenueFilters((current) => ({ ...current, surface: null }))}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.borderLight, backgroundColor: colors.surface },
                      !draftVenueFilters.surface && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                    ]}
                  >
                    <Text style={[typography.captionMedium, { color: !draftVenueFilters.surface ? colors.accent : colors.text.primary }]}>
                      Cualquiera
                    </Text>
                  </TouchableOpacity>
                  {COURT_SURFACE_OPTIONS.map((option) => {
                    const isSelected = draftVenueFilters.surface === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.82}
                        onPress={() => setDraftVenueFilters((current) => ({ ...current, surface: option.value }))}
                        style={[
                          styles.filterChip,
                          { borderColor: colors.borderLight, backgroundColor: colors.surface },
                          isSelected && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                        ]}
                      >
                        <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.primary }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.filterSection}>
                <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Cerramiento</Text>
                <View style={styles.filterChipWrap}>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={() => setDraftVenueFilters((current) => ({ ...current, enclosure: null }))}
                    style={[
                      styles.filterChip,
                      { borderColor: colors.borderLight, backgroundColor: colors.surface },
                      !draftVenueFilters.enclosure && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                    ]}
                  >
                    <Text style={[typography.captionMedium, { color: !draftVenueFilters.enclosure ? colors.accent : colors.text.primary }]}>
                      Cualquiera
                    </Text>
                  </TouchableOpacity>
                  {COURT_ENCLOSURE_OPTIONS.map((option) => {
                    const isSelected = draftVenueFilters.enclosure === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.82}
                        onPress={() => setDraftVenueFilters((current) => ({ ...current, enclosure: option.value }))}
                        style={[
                          styles.filterChip,
                          { borderColor: colors.borderLight, backgroundColor: colors.surface },
                          isSelected && { borderColor: colors.text.primary, backgroundColor: colors.text.primary }
                        ]}
                      >
                        <Text style={[typography.captionMedium, { color: isSelected ? colors.accent : colors.text.primary }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.filterFooter, { borderColor: colors.borderLight }]}>
              <TouchableOpacity onPress={() => setFiltersVisible(false)} style={styles.filterFooterButton}>
                <Text style={[typography.captionMedium, { color: colors.text.secondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDraftVenueFilters(createVenueFiltersState())} style={styles.filterFooterButton}>
                <Text style={[typography.captionMedium, { color: colors.text.secondary }]}>Limpiar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={applyFilters} style={[styles.filterFooterPrimary, { backgroundColor: colors.text.primary }]}>
                <Text style={[typography.captionMedium, { color: colors.accent }]}>Aplicar</Text>
              </TouchableOpacity>
            </View>
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
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={styles.modalHero}>
                {resolveAssetUrl(activeVenue?.image) ? (
                  <Image source={{ uri: resolveAssetUrl(activeVenue.image) }} style={styles.modalImage} />
                ) : (
                  <View style={[styles.modalImage, styles.modalImageFallback, { backgroundColor: colors.surfaceHighlight }]}>
                    <Feather name="map-pin" size={32} color={colors.text.secondary} />
                  </View>
                )}
                <View style={styles.modalHeroOverlay} />
                <View style={styles.modalHeroTop}>
                  <View style={[styles.modalHeroBadge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Text style={[typography.captionMedium, { color: colors.text.inverse }]}>SEDE</Text>
                  </View>
                  <TouchableOpacity onPress={() => setActiveVenue(null)} style={[styles.closeButton, styles.modalHeroCloseButton, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Feather name="x" size={18} color={colors.text.inverse} />
                  </TouchableOpacity>
                </View>
                <View style={styles.modalHeroBottom}>
                  <Text style={[typography.h2, styles.modalHeroTitle, { color: colors.text.inverse }]}>{activeVenue?.name}</Text>
                  <Text style={[typography.body, styles.modalHeroSubtitle, { color: colors.text.inverse, opacity: 0.82 }]}>
                    {activeVenue?.address || 'Direccion no disponible'}
                  </Text>
                </View>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.modalStatsRow}>
                  <View style={[styles.modalStatCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                    <Text style={[typography.label, { color: colors.text.tertiary }]}>CANCHAS</Text>
                    <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 6 }]}>{getCourtCountLabel(activeVenue)}</Text>
                  </View>
                  <View style={[styles.modalStatCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                    <Text style={[typography.label, { color: colors.text.tertiary }]}>PRECIO</Text>
                    <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: 6 }]}>
                      {activeVenue?.price_per_slot
                        ? `Desde $${getPlayerPrice(activeVenue.price_per_slot, 0).toLocaleString('es-AR')}`
                        : 'Consultar sede'}
                    </Text>
                  </View>
                </View>

                {(activeVenue?.phone || activeVenue?.address) ? (
                  <View style={styles.modalSection}>
                    <Text style={[typography.captionMedium, styles.modalSectionEyebrow, { color: colors.text.tertiary }]}>
                      INFORMACION GENERAL
                    </Text>
                    <View style={styles.modalInfoList}>
                      {activeVenue?.address ? (
                        <View style={[styles.modalInfoCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                          <View style={[styles.modalInfoIcon, { backgroundColor: colors.background }]}>
                            <Feather name="map-pin" size={15} color={colors.text.secondary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>Direccion</Text>
                            <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>{activeVenue.address}</Text>
                          </View>
                        </View>
                      ) : null}
                      {activeVenue?.phone ? (
                        <View style={[styles.modalInfoCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                          <View style={[styles.modalInfoIcon, { backgroundColor: colors.background }]}>
                            <Feather name="phone" size={15} color={colors.text.secondary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>Telefono</Text>
                            <Text style={[typography.body, { color: colors.text.primary, marginTop: 4 }]}>{activeVenue.phone}</Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ) : null}

                <View style={styles.modalSection}>
                  <Text style={[typography.captionMedium, styles.modalSectionEyebrow, { color: colors.text.tertiary }]}>
                    SERVICIOS DE LA SEDE
                  </Text>
                  {activeVenueServices.length > 0 ? (
                    <View style={styles.featureRow}>
                      {activeVenueServices.map((service) => (
                        <View key={`service-${service}`} style={[styles.modalPill, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                          <Text style={[typography.captionMedium, { color: colors.text.primary }]}>{SERVICE_LABELS[service] || service}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={[styles.modalEmptyStateCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                      <Text style={[typography.body, { color: colors.text.secondary }]}>Sin servicios cargados.</Text>
                    </View>
                  )}
                </View>

                <View style={styles.modalSection}>
                  <Text style={[typography.captionMedium, styles.modalSectionEyebrow, { color: colors.text.tertiary }]}>
                    CANCHAS DE LA SEDE
                  </Text>
                  {activeVenueCourts.length > 0 ? (
                    <>
                      <View style={styles.modalCourtList}>
                        {activeVenueCourts.map((court) => {
                          const isExpanded = expandedCourtId === court.id;

                          return (
                            <TouchableOpacity
                              key={`venue-court-${court.id}`}
                              activeOpacity={0.86}
                              style={[
                                styles.modalCourtCard,
                                {
                                  backgroundColor: isExpanded ? colors.surface : colors.surfaceHighlight,
                                  borderColor: isExpanded ? colors.text.primary : colors.borderLight,
                                }
                              ]}
                              onPress={() => setExpandedCourtId((current) => (current === court.id ? null : court.id))}
                            >
                              <View style={styles.modalCourtHeader}>
                                <View style={styles.modalCourtHeaderContent}>
                                  <Text style={[typography.bodyBold, { color: colors.text.primary }]}>
                                    {court.name || `Cancha ${court.id}`}
                                  </Text>
                                  <Text style={[typography.captionMedium, styles.modalCourtMeta, { color: colors.text.secondary }]}>
                                    {getCourtTypeLabel(court.type)}
                                  </Text>
                                </View>
                                <View style={[styles.modalInfoIcon, { backgroundColor: isExpanded ? colors.text.primary : colors.background }]}>
                                  <Feather
                                    name={isExpanded ? 'check' : 'chevron-right'}
                                    size={16}
                                    color={isExpanded ? colors.text.inverse : colors.text.secondary}
                                  />
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {selectedVenueCourt ? (
                        <View style={[styles.modalCourtDetailCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                          <Text style={[typography.captionMedium, styles.modalSectionEyebrow, { color: colors.text.tertiary, marginBottom: spacing.md }]}>
                            ESPECIFICACIONES DE {selectedVenueCourt.name || `CANCHA ${selectedVenueCourt.id}`}
                          </Text>
                          <View style={styles.modalCourtSpecs}>
                            <View style={styles.modalCourtSpecRow}>
                              <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>Tipo</Text>
                              <Text style={[typography.body, { color: colors.text.primary }]}>{getCourtTypeLabel(selectedVenueCourt.type)}</Text>
                            </View>
                            <View style={styles.modalCourtSpecRow}>
                              <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>Superficie</Text>
                              <Text style={[typography.body, { color: colors.text.primary }]}>{getCourtSurfaceLabel(selectedVenueCourt.surface)}</Text>
                            </View>
                            <View style={styles.modalCourtSpecRow}>
                              <Text style={[typography.captionMedium, { color: colors.text.tertiary }]}>Cerramiento</Text>
                              <Text style={[typography.body, { color: colors.text.primary }]}>{getCourtEnclosureLabel(selectedVenueCourt.enclosure)}</Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={[styles.modalEmptyStateCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                          <Text style={[typography.body, { color: colors.text.secondary }]}>Toca una cancha para ver sus especificaciones.</Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={[styles.modalEmptyStateCard, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
                      <Text style={[typography.body, { color: colors.text.secondary }]}>Sin canchas cargadas.</Text>
                    </View>
                  )}
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
                    variant="solid"
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedVenue(activeVenue);
                      setActiveVenue(null);
                    }}
                  />
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <SuccessToast
        visible={toastVisible}
        message={toastMessage}
        onDismiss={() => setToastVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerTextBlock: {
    flex: 1,
  },
  headerCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { paddingHorizontal: screenPadding.horizontal, paddingTop: spacing.xs },
  stepIndicator: { flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center', marginBottom: spacing.lg },
  stepItem: { flexDirection: 'row', alignItems: 'center' },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLine: { width: 16, height: 1, marginRight: 8 },
  venueColumn: {
    width: '100%',
  },
  searchControlsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  searchInputWrap: {
    flex: 1,
    marginBottom: 0,
  },
  filterButton: {
    minWidth: 108,
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexShrink: 0,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  filterIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  filterButtonLabel: {
    ...typography.captionMedium,
    fontSize: 13,
  },
  filterCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountBadgeInline: {
    marginLeft: 2,
  },
  activeFiltersStrip: {
    marginBottom: spacing.md,
  },
  activeFilterChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: spacing.sm,
  },
  venueSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  venueCountChip: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  optionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  optionTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  optionImage: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    marginRight: 12,
  },
  optionImageFallback: {
    width: 92,
    height: 92,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionInfo: { flex: 1 },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  optionFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  optionBottomRow: {
    marginTop: spacing.sm,
    alignItems: 'flex-start',
  },
  selectionPill: {
    minWidth: 110,
    minHeight: 30,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepFilterSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  floatingActionPortal: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 10,
    elevation: 10,
  },
  floatingActionFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0.96,
  },
  floatingActionShell: {
    position: 'absolute',
    left: screenPadding.horizontal,
    right: screenPadding.horizontal,
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.sm,
    shadowColor: '#000000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  btnRow: { flexDirection: 'row', gap: spacing.sm },
  singleActionRow: {
    justifyContent: 'center',
  },
  primaryActionButton: {
    flex: 1,
    alignSelf: 'center',
    minHeight: 52,
    borderRadius: radius.lg,
  },
  secondaryActionButton: {
    flex: 0.9,
    minHeight: 52,
    borderRadius: radius.lg,
  },
  primaryActionText: {
    ...typography.bodyBold,
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
  filterSheetCard: {
    maxHeight: '82%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: spacing.lg,
  },
  filterSheetContent: {
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterSection: {
    gap: spacing.sm,
  },
  filterChipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filterFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    borderTopWidth: 1,
  },
  filterFooterButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  filterFooterPrimary: {
    minWidth: 92,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    maxHeight: '92%',
  },
  modalScrollContent: {
    paddingBottom: spacing.lg,
  },
  modalHero: {
    position: 'relative',
  },
  modalHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
  },
  modalHeroTop: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeroBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalHeroCloseButton: {
    borderWidth: 0,
  },
  modalHeroBottom: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  modalHeroTitle: {
    letterSpacing: -0.4,
  },
  modalHeroSubtitle: {
    marginTop: 6,
  },
  modalImage: {
    width: '100%',
    height: 240,
  },
  modalImageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: spacing.lg,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStatsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalStatCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalSection: {
    marginTop: spacing.md,
  },
  modalSectionEyebrow: {
    marginBottom: spacing.sm,
    letterSpacing: 0.9,
  },
  modalInfoList: {
    gap: spacing.sm,
  },
  modalInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  modalInfoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPill: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalEmptyStateCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modalCourtList: {
    gap: spacing.sm,
  },
  modalCourtCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  modalCourtDetailCard: {
    borderWidth: 1,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  modalCourtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    padding: spacing.md,
  },
  modalCourtHeaderContent: {
    flex: 1,
  },
  modalCourtMeta: {
    marginTop: 4,
  },
  modalCourtSpecs: {
    gap: spacing.sm,
  },
  modalCourtSpecRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
