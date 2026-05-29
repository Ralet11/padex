import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { matchesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import MatchCard from '../../components/MatchCard';
import { ScreenWrapper, Skeleton, InlineError } from '../../components/ui';
import { spacing, radius } from '../../theme';
import { typography } from '../../theme/typography';
import { getRankByTier, RANK_ARRAY } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';
import { getCompetitiveTier, getProgressionPoints } from '../../utils/domain';

const CATEGORY_FILTERS = [
  { key: 'all', label: 'Todos', value: null },
  ...RANK_ARRAY.map((rank) => ({
    key: `tier-${rank.id}`,
    label: rank.name.split(' ')[0],
    value: rank.id,
  })),
];

const QUICK_DATE_FILTERS = [
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Manana' },
  { key: 'week', label: 'Semana' },
];

const DATE_FILTERS = [
  { key: 'all', label: 'Cualquier fecha' },
  ...QUICK_DATE_FILTERS,
];

function parseMatchDate(match) {
  if (!match?.date || !match?.time) return null;
  const parsed = new Date(`${match.date}T${match.time}`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfLocalDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isWithinSelectedDate(match, dateFilter, now) {
  if (dateFilter === 'all') return true;

  const matchDate = parseMatchDate(match);
  if (!matchDate) return false;

  const today = startOfLocalDay(now);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  if (dateFilter === 'today') return matchDate >= today && matchDate < tomorrow;
  if (dateFilter === 'tomorrow') return matchDate >= tomorrow && matchDate < addDays(today, 2);
  if (dateFilter === 'week') return matchDate >= today && matchDate < nextWeek;

  return true;
}

function matchMatchesCategory(match, tier) {
  if (!tier) return true;
  if (match?.open_category) return true;

  const minTier = Number(match?.min_category_tier || 1);
  const maxTier = Number(match?.max_category_tier || 7);

  return tier >= minTier && tier <= maxTier;
}

function normalizeVenueName(value) {
  return String(value || '').trim();
}

function buildVenueFilters(matches) {
  const venues = Array.from(
    new Set(matches.map((match) => normalizeVenueName(match?.venue_name)).filter(Boolean))
  );

  return [
    { key: 'all', label: 'Todas las sedes', value: 'all' },
    ...venues.map((venue) => ({
      key: venue,
      label: venue,
      value: venue,
    })),
  ];
}

function getDateLabel(dateFilter) {
  return DATE_FILTERS.find((item) => item.key === dateFilter)?.label || 'Cualquier fecha';
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryTier, setCategoryTier] = useState(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedVenue, setSelectedVenue] = useState('all');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = useCallback(async () => {
    setError(null);
    try {
      const params = {};
      if (categoryTier) params.category = categoryTier;
      const res = await matchesAPI.list(params);
      setMatches(Array.isArray(res?.data?.matches) ? res.data.matches : []);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los partidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryTier]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches();
  };

  const venueFilters = useMemo(() => buildVenueFilters(matches), [matches]);

  const visibleMatches = useMemo(() => {
    const now = new Date();

    return matches.filter((match) => {
      const venueName = normalizeVenueName(match?.venue_name);
      const matchesVenue = selectedVenue === 'all' || venueName === selectedVenue;

      return (
        matchMatchesCategory(match, categoryTier) &&
        isWithinSelectedDate(match, dateFilter, now) &&
        matchesVenue
      );
    });
  }, [matches, categoryTier, dateFilter, selectedVenue]);

  const activeFilterCount = [
    categoryTier !== null,
    dateFilter !== 'all',
    selectedVenue !== 'all',
  ].filter(Boolean).length;

  const selectedCategoryLabel = categoryTier
    ? getRankByTier(categoryTier).name.split(' ')[0]
    : null;
  const selectedVenueLabel = selectedVenue === 'all' ? null : selectedVenue;
  const selectedDateLabel = dateFilter === 'all' ? null : getDateLabel(dateFilter);
  const userTier = getCompetitiveTier(user);
  const userProgression = getProgressionPoints(user);

  const clearFilters = () => {
    setDateFilter('all');
    setSelectedVenue('all');
    setCategoryTier(null);
  };

  const renderChip = ({ label, active, onPress, icon, compact = false }) => (
    <TouchableOpacity
      key={`${label}-${compact ? 'compact' : 'default'}`}
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        compact ? styles.activeChip : styles.filterChip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={compact ? 12 : 14}
          color={active ? colors.accent : colors.text.tertiary}
          style={styles.chipIcon}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[
          compact ? typography.captionMedium : typography.bodyMedium,
          styles.chipText,
          { color: active ? colors.accent : colors.text.primary },
          active && styles.activeChipText,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={[typography.h1, styles.title, { color: colors.text.primary }]}>
            Partidos
          </Text>
          <Text style={[typography.body, styles.subtitle, { color: colors.text.secondary }]}>
            Encontrá algo para jugar sin dar vueltas.
          </Text>
        </View>

        <View
          style={[
            styles.rankChip,
            {
              backgroundColor: colors.surfaceHighlight,
              borderColor: colors.borderLight,
            },
          ]}
        >
          <Text style={[typography.captionMedium, { color: colors.text.primary }]}>
            {getRankByTier(userTier).name}
          </Text>
          <Text style={[typography.caption, { color: colors.text.tertiary }]}>
            {userProgression} pts
          </Text>
        </View>
      </View>

      <View style={styles.controlsRow}>
        <FlatList
          horizontal
          data={QUICK_DATE_FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.quickFiltersContent}
          renderItem={({ item }) =>
            renderChip({
              label: item.label,
              active: dateFilter === item.key,
              onPress: () => setDateFilter((current) => (current === item.key ? 'all' : item.key)),
            })
          }
        />

        <TouchableOpacity
          onPress={() => setIsFiltersOpen(true)}
          activeOpacity={0.82}
          style={[
            styles.filtersButton,
            {
              backgroundColor: colors.surface,
              borderColor: activeFilterCount ? colors.primary : colors.border,
            },
          ]}
        >
          <Feather
            name="sliders"
            size={15}
            color={activeFilterCount ? colors.accent : colors.text.secondary}
            style={styles.chipIcon}
          />
          <Text
            style={[
              typography.bodyMedium,
              { color: activeFilterCount ? colors.accent : colors.text.primary },
              activeFilterCount ? styles.activeChipText : null,
            ]}
          >
            Filtros
          </Text>
          {activeFilterCount ? (
            <View style={[styles.filtersBadge, { backgroundColor: colors.primary }]}>
              <Text style={[typography.captionMedium, { color: colors.accent }]}>
                {activeFilterCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>

      {activeFilterCount ? (
        <View style={styles.activeFiltersRow}>
          {selectedDateLabel
            ? renderChip({
                label: selectedDateLabel,
                active: true,
                onPress: () => setDateFilter('all'),
                icon: 'calendar',
                compact: true,
              })
            : null}
          {selectedVenueLabel
            ? renderChip({
                label: selectedVenueLabel,
                active: true,
                onPress: () => setSelectedVenue('all'),
                icon: 'map-pin',
                compact: true,
              })
            : null}
          {selectedCategoryLabel
            ? renderChip({
                label: selectedCategoryLabel,
                active: true,
                onPress: () => setCategoryTier(null),
                icon: 'sliders',
                compact: true,
              })
            : null}
          <TouchableOpacity onPress={clearFilters} activeOpacity={0.75} style={styles.clearInline}>
            <Text style={[typography.captionMedium, { color: colors.accent }]}>Limpiar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.text.primary }]}>Disponibles</Text>
        <Text style={[typography.body, { color: colors.text.tertiary }]}>
          {visibleMatches.length}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Feather
        name="calendar"
        size={28}
        color={colors.text.tertiary}
        style={{ marginBottom: spacing.sm }}
      />
      <Text style={[typography.h3, { color: colors.text.primary, marginBottom: spacing.xs }]}>
        No encontramos partidos
      </Text>
      <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>
        Cambia fecha, sede o nivel para ver mas opciones.
      </Text>
    </View>
  );

  const renderSheetChip = ({ label, active, onPress }) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.sheetChip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text
        style={[
          typography.bodyMedium,
          { color: active ? colors.accent : colors.text.primary },
          active ? styles.activeChipText : null,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <>
      <ScreenWrapper
        edges={['top']}
        refreshing={refreshing}
        onRefresh={onRefresh}
        disablePadding
        scrollViewProps={{ refreshControl: undefined }}
      >
        {loading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton height={28} width="52%" style={{ marginBottom: spacing.xs }} />
            <Skeleton height={16} width="46%" style={{ marginBottom: spacing.lg }} />
            <Skeleton height={44} width="100%" style={{ marginBottom: spacing.md }} />
            <Skeleton height={28} width="70%" style={{ marginBottom: spacing.md }} />
            <Skeleton height={112} width="100%" style={{ marginBottom: spacing.md }} />
            <Skeleton height={112} width="100%" style={{ marginBottom: spacing.md }} />
          </View>
        ) : error ? (
          <View style={styles.errorWrap}>
            <InlineError message={error} onRetry={fetchMatches} />
          </View>
        ) : (
          <FlatList
            data={visibleMatches}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <View style={styles.itemWrap}>
                <MatchCard
                  match={item}
                  compact
                  onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
                />
              </View>
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.list}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScreenWrapper>

      <Modal
        visible={isFiltersOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsFiltersOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsFiltersOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: colors.background }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.sheetHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              <View style={styles.sheetHeader}>
                <View>
                  <Text style={[typography.h2, { color: colors.text.primary }]}>Filtros</Text>
                  <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>
                    Ajusta fecha, sede y nivel.
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setIsFiltersOpen(false)} activeOpacity={0.75}>
                  <Feather name="x" size={20} color={colors.text.primary} />
                </TouchableOpacity>
              </View>

              <View style={styles.sheetSection}>
                <Text style={[typography.captionMedium, styles.sheetLabel, { color: colors.text.tertiary }]}>
                  Fecha
                </Text>
                <View style={styles.sheetWrap}>
                  {DATE_FILTERS.map((item) =>
                    renderSheetChip({
                      label: item.label,
                      active: dateFilter === item.key,
                      onPress: () => setDateFilter(item.key),
                    })
                  )}
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={[typography.captionMedium, styles.sheetLabel, { color: colors.text.tertiary }]}>
                  Sede
                </Text>
                <View style={styles.sheetWrap}>
                  {venueFilters.map((item) =>
                    renderSheetChip({
                      label: item.label,
                      active: selectedVenue === item.value,
                      onPress: () => setSelectedVenue(item.value),
                    })
                  )}
                </View>
              </View>

              <View style={styles.sheetSection}>
                <Text style={[typography.captionMedium, styles.sheetLabel, { color: colors.text.tertiary }]}>
                  Nivel
                </Text>
                <View style={styles.sheetWrap}>
                  {CATEGORY_FILTERS.map((item) =>
                    renderSheetChip({
                      label: item.label,
                      active: categoryTier === item.value,
                      onPress: () => setCategoryTier(item.value),
                    })
                  )}
                </View>
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  onPress={clearFilters}
                  activeOpacity={0.82}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[typography.bodyBold, { color: colors.text.primary }]}>Limpiar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsFiltersOpen(false)}
                  activeOpacity={0.82}
                  style={[
                    styles.primaryButton,
                    {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[typography.bodyBold, { color: colors.accent }]}>Ver partidos</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingBottom: 110,
  },
  itemWrap: {
    paddingHorizontal: screenPadding.horizontal,
  },
  headerContainer: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    letterSpacing: -1,
  },
  subtitle: {
    marginTop: 2,
    lineHeight: 18,
  },
  rankChip: {
    minWidth: 78,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.sm,
  },
  quickFiltersContent: {
    gap: 8,
    paddingRight: 8,
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    flexShrink: 1,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filtersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  filtersBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  activeFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  activeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  clearInline: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  activeChipText: {
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: screenPadding.horizontal,
    paddingVertical: spacing.huge,
  },
  skeletonWrap: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.lg,
  },
  errorWrap: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xxl,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '90%',
    minHeight: '58%',
  },
  sheetHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetScrollContent: {
    paddingBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  sheetSection: {
    marginBottom: spacing.lg,
  },
  sheetLabel: {
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  sheetWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sheetChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: spacing.sm,
  },
  secondaryButton: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    flex: 1.3,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
