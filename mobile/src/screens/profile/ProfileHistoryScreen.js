import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { screenPadding } from '../../theme/layout';
import { InlineError, Skeleton } from '../../components/ui';
import MatchCard from '../../components/MatchCard';

function sortMatchesDesc(matches = []) {
  return [...matches].sort((left, right) => {
    const leftDate = new Date(left?.time ? `${left?.date}T${left?.time}` : left?.date || 0).getTime();
    const rightDate = new Date(right?.time ? `${right?.date}T${right?.time}` : right?.date || 0).getTime();
    return rightDate - leftDate;
  });
}

export default function ProfileHistoryScreen({ navigation, route }) {
  const { colors } = useTheme();
  const history = route?.params?.history || null;
  const matches = Array.isArray(route?.params?.matches) ? route.params.matches : [];
  const loading = Boolean(route?.params?.loading);
  const error = route?.params?.error || null;

  const sortedMatches = useMemo(() => sortMatchesDesc(matches), [matches]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={[typography.h1, { color: colors.text.primary }]}>Historial</Text>
        </View>
        <View style={styles.loadingWrap}>
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} width="100%" height={170} radius={radius.xl} style={{ marginBottom: spacing.md }} />
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <FlatList
        data={sortedMatches}
        keyExtractor={(item, index) => String(item?.id || `match-${index}`)}
        renderItem={({ item }) => (
          <MatchCard
            match={item}
            compact
            onPress={() => navigation.navigate('Inicio', { screen: 'MatchDetail', params: { matchId: item.id } })}
          />
        )}
        ListHeaderComponent={(
          <View style={styles.headerWrap}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={[styles.backBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}
                accessibilityLabel="Volver al perfil"
                accessibilityHint="Regresa a la pantalla de perfil"
                accessibilityRole="button"
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              >
                <Feather name="chevron-left" size={18} color={colors.text.primary} />
              </TouchableOpacity>

              <View style={styles.headerTextWrap}>
                <Text style={[typography.h1, { color: colors.text.primary }]}>Historial</Text>
                <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}> 
                  {history?.totalMatches ? `${history.totalMatches} partidos` : 'Sin partidos todavía'}
                </Text>
              </View>
            </View>

            {error ? <InlineError message={error} style={{ marginTop: spacing.sm }} /> : null}
          </View>
        )}
        ListEmptyComponent={(
          <View style={[styles.emptyCard, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}> 
            <Feather name="calendar" size={32} color={colors.text.secondary} />
            <Text style={[typography.h3, { color: colors.text.primary, marginTop: spacing.sm }]}>Todavía no hay partidos</Text>
            <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center', marginTop: 4 }]}> 
              Cuando juegues tus primeros encuentros, vas a verlos acá ordenados por fecha.
            </Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={7}
        removeClippedSubviews
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingWrap: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.lg,
  },
  listContent: {
    paddingHorizontal: screenPadding.horizontal,
    paddingBottom: 120,
  },
  headerWrap: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTextWrap: {
    flex: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
});
