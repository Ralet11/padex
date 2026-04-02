import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity,
} from 'react-native';
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

function matchMatchesCategory(match, tier) {
  if (!tier) return true;
  if (match?.open_category) return true;

  const minTier = Number(match?.min_category_tier || 1);
  const maxTier = Number(match?.max_category_tier || 7);

  return tier >= minTier && tier <= maxTier;
}

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryTier, setCategoryTier] = useState(null);
  const [error, setError] = useState(null);

  const fetchMatches = useCallback(async () => {
    setError(null);
    try {
      const params = {};
      if (categoryTier) params.category = categoryTier;
      const res = await matchesAPI.list(params);
      setMatches(res.data.matches);
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los partidos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryTier]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const onRefresh = () => { setRefreshing(true); fetchMatches(); };
  const visibleMatches = useMemo(
    () => matches.filter((match) => matchMatchesCategory(match, categoryTier)),
    [matches, categoryTier]
  );
  const userTier = getCompetitiveTier(user);
  const userProgression = getProgressionPoints(user);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Saludo */}
      <View style={styles.greeting}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.h1, { color: colors.text.primary, letterSpacing: -1 }]}>
            Partidos
          </Text>
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]}>
            Encontrá un lugar para jugar hoy.
          </Text>
        </View>
        <View style={[styles.eloChip, { backgroundColor: colors.surfaceHighlight, borderColor: colors.borderLight }]}>
          <Text style={[typography.bodyBold, { color: colors.text.primary }]}> 
            ⭐ {userProgression}
          </Text>
          <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 2 }]}> 
            {getRankByTier(userTier).name}
          </Text>
        </View>
      </View>

      {/* Filtros de categoría */}
      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={CATEGORY_FILTERS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const isActive = categoryTier === item.value;
            return (
              <TouchableOpacity
                style={[
                  styles.filter,
                  { backgroundColor: isActive ? colors.primary : colors.surface },
                  { borderColor: isActive ? colors.primary : colors.border }
                ]}
                onPress={() => setCategoryTier(item.value)}
              >
                <Text style={[
                  typography.bodyMedium,
                  { color: isActive ? colors.accent : colors.text.primary, textTransform: 'capitalize' },
                  isActive && { fontWeight: '700' }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[typography.h3, { color: colors.text.primary }]}>
          Disponibles
        </Text>
        <Text style={[typography.body, { color: colors.text.tertiary }]}>
          {visibleMatches.length}
        </Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={[typography.h2, { color: colors.text.tertiary, marginBottom: spacing.sm }]}>Ningún partido</Text>
      <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>Modificá los filtros o vuelve más tarde.</Text>
    </View>
  );

  return (
    <ScreenWrapper
      edges={['top']}
      refreshing={refreshing}
      onRefresh={onRefresh}
      disablePadding
      scrollViewProps={{ refreshControl: undefined }}
    >
      {loading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={28} width="60%" style={{ marginBottom: spacing.sm }} />
          <Skeleton height={16} width="40%" style={{ marginBottom: spacing.xl }} />
          <Skeleton height={40} width="100%" style={{ marginBottom: spacing.xl }} />
          <Skeleton height={100} width="100%" style={{ marginBottom: spacing.md }} />
          <Skeleton height={100} width="100%" style={{ marginBottom: spacing.md }} />
          <Skeleton height={100} width="100%" />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: 110 },
  itemWrap: { paddingHorizontal: screenPadding.horizontal },
  headerContainer: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  eloChip: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  filtersWrap: { marginBottom: spacing.xl },
  filters: { gap: spacing.sm, paddingRight: screenPadding.horizontal },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: spacing.md
  },
  empty: { alignItems: 'center', paddingVertical: spacing.huge },
  skeletonWrap: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xl,
  },
  errorWrap: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xxl,
  },
});
