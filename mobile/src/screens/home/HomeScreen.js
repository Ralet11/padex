import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeContext';
import MatchCard from '../../components/MatchCard';
import { spacing, radius } from '../../theme';
import { typography } from '../../theme/typography';
import { getRankByTier, RANK_ARRAY } from '../../utils/rankings';
import { screenPadding } from '../../theme/layout';

const CATEGORY_FILTERS = ['Todos', ...RANK_ARRAY.map(r => r.name.split(' ')[0])];

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState('Todos');

  const fetchMatches = useCallback(async () => {
    try {
      const params = {};
      if (category !== 'Todos') params.category = category;
      const res = await matchesAPI.list(params);
      setMatches(res.data.matches);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [category]);

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const onRefresh = () => { setRefreshing(true); fetchMatches(); };

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
            ⭐ {user?.stars}
          </Text>
          <Text style={[typography.label, { color: colors.text.tertiary, marginTop: 2 }]}>
            {getRankByTier(user?.category_tier).name}
          </Text>
        </View>
      </View>

      {/* Filtros de categoría */}
      <View style={styles.filtersWrap}>
        <FlatList
          horizontal
          data={CATEGORY_FILTERS}
          keyExtractor={(i) => i}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
          renderItem={({ item }) => {
            const isActive = category === item;
            return (
              <TouchableOpacity
                style={[
                  styles.filter,
                  { backgroundColor: isActive ? colors.primary : colors.surface },
                  { borderColor: isActive ? colors.primary : colors.border }
                ]}
                onPress={() => setCategory(item)}
              >
                <Text style={[
                  typography.bodyMedium,
                  { color: isActive ? colors.accent : colors.text.primary, textTransform: 'capitalize' },
                  isActive && { fontWeight: '700' }
                ]}>
                  {item}
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
          {matches.length}
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.itemWrap}>
            <MatchCard
              match={item}
              onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
            />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={!loading ? renderEmpty : null}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
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
});
