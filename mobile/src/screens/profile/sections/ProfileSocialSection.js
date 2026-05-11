import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { InlineError, Skeleton } from '../../../components/ui';
import ProfileSectionCard from '../../../components/profile/ProfileSectionCard';
import { useTheme } from '../../../theme/ThemeContext';
import { typography } from '../../../theme/typography';

const SOCIAL_ICONS = {
  instagram: 'instagram',
  x: 'twitter',
  tiktok: 'video',
  website: 'globe',
  whatsapp: 'message-circle',
};

async function openExternalLink(url) {
  if (!url) return;
  try {
    await Linking.openURL(url);
  } catch (_) {
    // no-op: keep CTA non-blocking
  }
}

export default function ProfileSocialSection({ social, loading, error, onRetry, onEditProfile }) {
  const { colors, spacing, radius } = useTheme();
  const actions = Array.isArray(social?.actions) ? social.actions : null;
  const isActionRow = Array.isArray(actions);

  if (loading) {
    return (
      <ProfileSectionCard>
        {isActionRow ? (
          <View style={styles.actionRow}>
            <Skeleton width="31%" height={50} />
            <Skeleton width="31%" height={50} />
            <Skeleton width="31%" height={50} />
          </View>
        ) : (
          <>
            <Skeleton width={120} height={18} style={{ marginBottom: spacing.md }} />
            <Skeleton width="100%" height={42} style={{ marginBottom: spacing.sm }} />
            <Skeleton width="100%" height={42} />
          </>
        )}
      </ProfileSectionCard>
    );
  }

  if (isActionRow) {
    return (
      <ProfileSectionCard>
        {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

        <View style={styles.actionRow}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.key}
              onPress={() => social?.onAction?.(action)}
              style={[styles.actionButton, { borderColor: colors.borderLight, borderRadius: radius.full, backgroundColor: colors.surfaceHighlight }]}
              accessibilityLabel={action.accessibilityLabel || action.label}
              accessibilityHint={action.accessibilityHint || `Abre la acción ${action.label}`}
              accessibilityRole="button"
              hitSlop={{ top: 6, right: 4, bottom: 6, left: 4 }}
            >
              <Feather name={action.icon || 'arrow-right'} size={15} color={action.tone === 'danger' ? colors.danger : colors.text.primary} />
              <Text style={[typography.captionMedium, styles.actionLabel, { color: action.tone === 'danger' ? colors.danger : colors.text.primary }]}> 
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard>
      <Text style={[typography.h3, { color: colors.text.primary, marginBottom: spacing.sm }]} accessibilityRole="header">Social</Text>

      {error ? <InlineError message={error} onRetry={onRetry} style={{ marginBottom: spacing.md }} /> : null}

      {social?.hasLinks ? (
        <View style={styles.list}>
          {social.links.map((link) => (
            <TouchableOpacity
              key={link.key}
              onPress={() => openExternalLink(link.href)}
              style={[styles.linkRow, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}
              accessibilityLabel={`Abrir ${link.label}`}
              accessibilityHint="Abre el enlace en una app externa"
              accessibilityRole="button"
            >
              <View style={styles.left}>
                <Feather name={SOCIAL_ICONS[link.key] || 'link'} size={16} color={colors.text.secondary} />
                <Text style={[typography.bodyMedium, { color: colors.text.primary }]}>{link.label}</Text>
              </View>
              <Feather name="external-link" size={14} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={[styles.emptyState, { borderColor: colors.borderLight, borderRadius: radius.lg, backgroundColor: colors.surfaceHighlight }]}> 
          <Text style={[typography.bodyBold, { color: colors.text.primary, marginBottom: spacing.xs }]}> 
            {social?.emptyState?.title || 'Sin redes por ahora'}
          </Text>
          <Text style={[typography.body, { color: colors.text.secondary, textAlign: 'center' }]}> 
            {social?.emptyState?.message || 'Podés completar esta sección más adelante.'}
          </Text>

          <TouchableOpacity
            onPress={onEditProfile}
            style={[styles.emptyAction, { borderColor: colors.borderLight, borderRadius: radius.full }]}
            accessibilityLabel={social?.emptyState?.actionLabel || 'Editar perfil'}
            accessibilityHint="Abre la pantalla de edición de perfil"
            accessibilityRole="button"
          >
            <Text style={[typography.captionMedium, { color: colors.text.primary }]}> 
              {social?.emptyState?.actionLabel || 'Editar perfil'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </ProfileSectionCard>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
  },
  linkRow: {
    borderWidth: 1,
    paddingHorizontal: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyState: {
    borderWidth: 1,
    alignItems: 'center',
    padding: 16,
  },
  emptyAction: {
    marginTop: 12,
    borderWidth: 1,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexGrow: 1,
    flexBasis: '31%',
    minHeight: 52,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  actionLabel: {
    textAlign: 'center',
    flexShrink: 1,
  },
});
