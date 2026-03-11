import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, RefreshControl,
  TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { matchesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import MatchCard from '../../components/MatchCard';
import { colors, spacing, radius } from '../../theme';

const CATEGORY_FILTERS = ['Todos', 'principiante', 'intermedio', 'avanzado', 'profesional'];
const CATEGORY_EMOJIS = { principiante: '🌱', intermedio: '🎯', avanzado: '🔥', profesional: '🏆' };

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
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
    <View>
      {/* Saludo */}
      <View style={styles.greeting}>
        <View>
          <Text style={styles.greetingText}>Hola, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.greetingSubtext}>Encontrá un partido para hoy</Text>
        </View>
        <View style={styles.eloChip}>
          <Text style={styles.eloText}>⭐ {user?.elo}</Text>
          <Text style={styles.eloLabel}>{user?.category}</Text>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filter, category === item && styles.filterActive]}
              onPress={() => setCategory(item)}
            >
              <Text style={[styles.filterText, category === item && styles.filterTextActive]}>
                {CATEGORY_EMOJIS[item] ? `${CATEGORY_EMOJIS[item]} ` : ''}{item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <Text style={styles.sectionTitle}>
        {matches.length} {matches.length === 1 ? 'partido disponible' : 'partidos disponibles'}
      </Text>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🎾</Text>
      <Text style={styles.emptyTitle}>Sin partidos disponibles</Text>
      <Text style={styles.emptyText}>Sé el primero en crear un partido para hoy</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={matches}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
          />
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
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.md, paddingBottom: 90 },
  greeting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: 4,
  },
  greetingText: { fontSize: 22, fontWeight: '800', color: colors.text },
  greetingSubtext: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  eloChip: {
    backgroundColor: colors.primaryBg,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '44',
  },
  eloText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  eloLabel: { fontSize: 10, color: colors.primary, marginTop: 2, textTransform: 'capitalize' },
  filtersWrap: { marginBottom: spacing.md },
  filters: { gap: 8, paddingRight: spacing.md },
  filter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, color: colors.textSecondary, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  sectionTitle: { fontSize: 14, color: colors.textMuted, marginBottom: 12, fontWeight: '500' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
});
