import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { InlineError, Skeleton } from '../../../components/ui';
import ProfileSectionCard from '../../../components/profile/ProfileSectionCard';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme/typography';

const INFO_ICONS = {
  position: 'crosshair',
  paddle_brand: 'shield',
  preferred_partner: 'users',
  city: 'map-pin',
  club: 'flag',
};

export default function ProfileInfoSection({ info, loading, error, onRetry }) {
  const { colors, spacing, radius } = useTheme();
  const shellMeta = Array.isArray(info?.meta) ? info.meta : [];
  const isV2About = Array.isArray(info?.meta) || Boolean(info?.fallback);

  if (loading) {
    return (
      <ProfileSectionCard>
        {isV2About ? (
          <>
            <Skeleton width={160} height={18} style={{ marginBottom: spacing.md }} />
            <Skeleton width="100%" height={60} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="100%" height={60} />
          </>
        ) : (
          <>
            <Skeleton width={120} height={18} style={{ marginBottom: spacing.md }} />
            <Skeleton width="100%" height={14} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="85%" height={14} style={{ marginBottom: spacing.md }} />
            <Skeleton width="100%" height={44} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="100%" height={44} />
          </>
        )}
      </ProfileSectionCard>
    );
  }

  if (isV2About) {
    return (
      <ProfileSectionCard>
        {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

        <Text style={[typography.h3, { color: colors.text.primary, marginBottom: spacing.sm }]} accessibilityRole="header">Detalles de juego</Text>

        {shellMeta.length ? (
          <View style={styles.v2MetaList}>
            {shellMeta.map((row) => (
              <View
                key={row.key}
                style={[styles.v2MetaRow, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}
                accessible
                accessibilityLabel={`${row.label}: ${row.value}`}
              >
                <View style={[styles.v2MetaIcon, { backgroundColor: colors.surface, borderRadius: radius.full, borderColor: colors.borderLight }]}> 
                  <Feather name={INFO_ICONS[row.key] || row.icon || 'info'} size={15} color={colors.text.secondary} />
                </View>
                <View style={styles.textWrap}>
                  <Text style={[typography.caption, styles.label, { color: colors.text.secondary }]}>{row.label}</Text>
                  <Text style={[typography.bodyMedium, styles.value, { color: colors.text.primary }]}>{row.value}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.v2Fallback, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}> 
            <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: spacing.xs }]}>{info?.fallback?.title || 'Tu perfil recién empieza'}</Text>
            <Text style={[typography.body, { color: colors.text.secondary }]}>{info?.fallback?.message || 'Completá ciudad, club o posición para darle más contexto a tu perfil.'}</Text>
          </View>
        )}
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard>
      <Text style={[typography.h3, { color: colors.text.primary, marginBottom: spacing.sm }]} accessibilityRole="header">Info</Text>

      {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

      {info?.bio ? (
        <Text style={[typography.body, styles.bio, { color: colors.text.secondary, marginBottom: spacing.md }]}>
          {info.bio}
        </Text>
      ) : null}

      {Array.isArray(info?.rows) && info.rows.length > 0 ? (
        <View style={[styles.rowsWrap, { borderColor: colors.borderLight, borderRadius: radius.lg }]}> 
          {info.rows.map((row, index) => (
            <View key={row.key} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: colors.borderLight }]}> 
              <Feather name={INFO_ICONS[row.key] || 'info'} size={16} color={colors.text.tertiary} style={styles.icon} />
              <View style={styles.textWrap}>
                <Text style={[typography.body, styles.label, { color: colors.text.secondary }]}>{row.label}</Text>
                <Text style={[typography.bodyMedium, styles.value, { color: colors.text.primary }]}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={[typography.body, { color: colors.text.tertiary }]}>Completá tu info para destacarte más.</Text>
      )}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  bio: {
    lineHeight: 20,
  },
  rowsWrap: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    padding: 12,
  },
  icon: {
    width: 26,
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    marginBottom: 2,
  },
  value: {
    textTransform: 'capitalize',
    flexShrink: 1,
  },
  v2MetaList: {
    gap: 10,
  },
  v2MetaRow: {
    borderWidth: 1,
    minHeight: 60,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  v2MetaIcon: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  v2Fallback: {
    borderWidth: 1,
    padding: 14,
  },
});
