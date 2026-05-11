import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { InlineError, Skeleton } from '../../../components/ui';
import ProfileSectionCard from '../../../components/profile/ProfileSectionCard';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme/typography';

export default function ProfileHistoryCTASection({ history, loading, error, onRetry, onPress, onMatchPress }) {
  const { colors, spacing, radius } = useTheme();

  if (loading) {
    return (
      <ProfileSectionCard>
        <Skeleton width={140} height={18} style={{ marginBottom: spacing.md }} />
        <Skeleton width="100%" height={72} style={{ marginBottom: spacing.sm }} />
        <Skeleton width="100%" height={44} />
      </ProfileSectionCard>
    );
  }

  const summary = history?.summary || history;
  const items = Array.isArray(history?.items) ? history.items : [];
  const hasItems = typeof history?.hasItems === 'boolean' ? history.hasItems : items.length > 0;

  return (
    <ProfileSectionCard>
      {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

      <View style={styles.header}>
        <View>
          <Text style={[typography.h3, { color: colors.text.primary }]} accessibilityRole="header">Historial</Text>
          <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}> 
            {summary?.totalMatches ? `${summary.totalMatches} partidos registrados` : 'Sin partidos registrados todavía'}
          </Text>
          {summary?.latestMatchDateLabel ? (
            <Text style={[typography.caption, { color: colors.text.secondary, marginTop: 2 }]}>Último: {summary.latestMatchDateLabel}</Text>
          ) : null}
        </View>

        <Feather
          name="chevron-right"
          size={18}
          color={colors.text.tertiary}
          accessible={false}
          importantForAccessibility="no"
        />
      </View>

      {hasItems ? (
        <View style={styles.list}>
          {items.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onMatchPress?.(item.match)}
              style={[styles.historyCard, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}
              accessibilityLabel={`Abrir partido ${item.title}`}
              accessibilityHint="Abre el detalle del partido"
              accessibilityRole="button"
              hitSlop={{ top: 6, right: 4, bottom: 6, left: 4 }}
            >
              <View style={styles.historyTitleRow}>
                <Text style={[typography.bodyBold, styles.historyTitle, { color: colors.text.primary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[typography.caption, { color: colors.text.secondary }]}>{item.dateLabel || 'Sin fecha'}</Text>
              </View>
              <Text style={[typography.body, { color: colors.text.secondary, marginTop: 4 }]} numberOfLines={2}>{item.summary}</Text>
              <Text style={[typography.captionMedium, { color: colors.text.tertiary, marginTop: 8 }]}>{item.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}> 
          <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: spacing.xs }]}>{history?.emptyState?.title || 'Todavía no tenés historial'}</Text>
          <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}>{history?.emptyState?.message || 'Cuando juegues tus primeros partidos, el resumen va a aparecer acá.'}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.cta, { borderRadius: radius.full, borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}
        onPress={onPress}
        accessibilityLabel={summary?.ctaLabel || history?.emptyState?.ctaLabel || 'Ver historial completo'}
        accessibilityHint="Abre la pantalla con todos tus partidos"
        accessibilityRole="button"
      >
        <Text style={[typography.bodyBold, styles.ctaText, { color: colors.text.primary }]}>{summary?.ctaLabel || history?.emptyState?.ctaLabel || 'Ver historial completo'}</Text>
      </TouchableOpacity>
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cta: {
    minHeight: 48,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  ctaText: {
    textAlign: 'center',
  },
  list: {
    gap: 8,
    marginBottom: 12,
  },
  historyCard: {
    borderWidth: 1,
    padding: 14,
    minHeight: 92,
  },
  historyTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyTitle: {
    flex: 1,
  },
  emptyState: {
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 108,
  },
});
