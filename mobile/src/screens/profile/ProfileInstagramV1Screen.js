import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  Linking,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { ProfileProvider, useProfile } from '../../context/ProfileContext';
import { useTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/typography';
import { spacing, radius } from '../../theme/spacing';
import { screenPadding } from '../../theme/layout';
import ProfileHeroSection from './sections/ProfileHeroSection';
import ProfileInfoSection from './sections/ProfileInfoSection';
import ProfileSocialSection from './sections/ProfileSocialSection';
import ProfileFeedPreviewSection from './sections/ProfileFeedPreviewSection';
import ProfileHistoryCTASection from './sections/ProfileHistoryCTASection';
import ProfileSectionCard from '../../components/profile/ProfileSectionCard';

function openProfileHistory(navigation, historyVM, matches, loadingByBlock, errorByBlock) {
  navigation.navigate('ProfileHistory', {
    history: historyVM,
    matches,
    loading: loadingByBlock.matches,
    error: errorByBlock.matches,
  });
}

function AnimatedProfileBlock({ index, children }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const animationDelay = Math.min(index * 24, 72);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        delay: animationDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        delay: animationDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [animationDelay, opacity, translateY]);

  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

function getAccentColor(colors, accent) {
  if (accent === 'success') return colors.success;
  if (accent === 'accent') return colors.accent;
  if (accent === 'muted') return colors.text.tertiary;
  if (accent === 'danger') return colors.danger;
  return colors.text.primary;
}

async function openHighlightAction(navigation, highlight) {
  if (!highlight?.pressAction) return;

  if (highlight.pressAction.type === 'link' && highlight.pressAction.href) {
    try {
      await Linking.openURL(highlight.pressAction.href);
    } catch (_) {
      Alert.alert('No pudimos abrir ese link');
    }
    return;
  }

  if (highlight.pressAction.type === 'match' && highlight.pressAction.matchId) {
    navigation.navigate('Inicio', { screen: 'MatchDetail', params: { matchId: highlight.pressAction.matchId } });
  }
}

function ProfileHighlightsRail({ highlights, loading, navigation }) {
  const { colors, spacing: themeSpacing, radius: themeRadius } = useTheme();

  if (loading) {
    return (
      <ProfileSectionCard withChrome={false} withPadding={false} withShadow={false} style={styles.railCard}>
        <Text style={[typography.captionMedium, styles.railLabel, { color: colors.text.secondary }]}>Highlights</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: themeSpacing.sm }}>
          {[0, 1, 2, 3].map((item) => (
            <View key={item} style={[styles.railItem, { marginRight: themeSpacing.sm }]}> 
              <View style={[styles.railAvatar, { borderRadius: themeRadius.full, backgroundColor: colors.surface, borderColor: colors.borderLight }]} />
              <View style={[styles.railBar, { borderRadius: themeRadius.full, backgroundColor: colors.surfaceHighlight }]} />
            </View>
          ))}
        </ScrollView>
      </ProfileSectionCard>
    );
  }

  return (
    <ProfileSectionCard withChrome={false} withPadding={false} withShadow={false} style={styles.railCard}>
      <Text style={[typography.captionMedium, styles.railLabel, { color: colors.text.secondary }]}>Highlights</Text>

      {highlights?.hasItems ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: themeSpacing.sm }}>
          {highlights.items.map((item) => {
            const accentColor = getAccentColor(colors, item.accent);

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.railItem, { marginRight: themeSpacing.sm }]}
                onPress={() => openHighlightAction(navigation, item)}
                accessibilityRole="button"
                accessibilityLabel={`Abrir highlight ${item.title}`}
                accessibilityHint={item.pressAction?.type === 'link' ? 'Abre un link externo' : item.pressAction?.type === 'match' ? 'Abre el detalle del partido' : 'Muestra este highlight'}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <View style={[styles.railAvatar, { borderRadius: themeRadius.full, backgroundColor: `${accentColor}12`, borderColor: `${accentColor}55` }]}> 
                  <Feather name={item.icon || 'star'} size={20} color={accentColor} />
                </View>
                <Text style={[typography.captionMedium, styles.railTitle, { color: colors.text.primary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[typography.caption, styles.railSubtitle, { color: colors.text.secondary }]} numberOfLines={2}>{item.subtitle}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <ProfileSectionCard withPadding={false} withShadow={false} style={[styles.emptyRailCard, { borderRadius: themeRadius.xl, borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}> 
          <Text style={[typography.bodyBold, { color: colors.text.primary }]}>{highlights?.emptyState?.title || 'Todavía no hay highlights'}</Text>
          <Text style={[typography.body, { color: colors.text.secondary, marginTop: themeSpacing.xs }]}>{highlights?.emptyState?.message || 'Completá tu perfil o jugá algunos partidos para desbloquear accesos rápidos.'}</Text>
        </ProfileSectionCard>
      )}
    </ProfileSectionCard>
  );
}

function ProfileShellTabs({ tabs, activeTab, onChange }) {
  const { colors, spacing: themeSpacing, radius: themeRadius } = useTheme();

  return (
    <View
      style={[styles.tabsShell, { backgroundColor: colors.background, paddingBottom: themeSpacing.sm }]}
      accessible
      accessibilityLabel="Navegación entre feed, actividad e historial"
    > 
      <View style={[styles.tabsRow, { borderRadius: themeRadius.full, backgroundColor: colors.surface, borderColor: colors.borderLight }]}> 
        {(tabs || []).map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                { borderRadius: themeRadius.full },
                isActive && { backgroundColor: colors.surfaceHighlight },
              ]}
              onPress={() => onChange(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={`Abrir tab ${tab.label}`}
              accessibilityHint={`Cambia el contenido del perfil a ${tab.label}`}
              hitSlop={{ top: 6, right: 4, bottom: 6, left: 4 }}
            >
              <Feather name={tab.icon} size={14} color={isActive ? colors.text.primary : colors.text.secondary} />
              <Text style={[typography.captionMedium, { color: isActive ? colors.text.primary : colors.text.secondary }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ProfileShellPlaceholder({ title, body, icon = 'clock', actionLabel, onAction }) {
  const { colors, spacing: themeSpacing, radius: themeRadius } = useTheme();

  return (
    <ProfileSectionCard style={[styles.placeholderCard, { borderRadius: themeRadius.xl, borderColor: colors.borderLight, backgroundColor: colors.surface }]}> 
      <View style={[styles.placeholderIcon, { backgroundColor: colors.surfaceHighlight, borderRadius: themeRadius.full }]}> 
        <Feather name={icon} size={16} color={colors.text.secondary} />
      </View>
      <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: themeSpacing.sm }]}>{title}</Text>
      <Text style={[typography.body, { color: colors.text.secondary, marginTop: themeSpacing.xs }]}>{body}</Text>
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          style={[styles.placeholderAction, { borderColor: colors.borderLight, borderRadius: themeRadius.full, marginTop: themeSpacing.md }]}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[typography.captionMedium, { color: colors.text.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </ProfileSectionCard>
  );
}

function ProfileActivityTimeline({ activity, loading, error, onRetry, onMatchPress }) {
  const { colors, spacing: themeSpacing, radius: themeRadius } = useTheme();

  if (loading) {
    return (
      <ProfileSectionCard>
        <View style={styles.timelineList}>
          {[0, 1, 2].map((item) => (
            <View key={item} style={[styles.timelineCard, { borderColor: colors.borderLight, borderRadius: themeRadius.lg, backgroundColor: colors.surfaceHighlight }]} />
          ))}
        </View>
      </ProfileSectionCard>
    );
  }

  if (error) {
    return (
      <ProfileShellPlaceholder
        title={activity?.errorState?.title || 'No pudimos cargar tu actividad'}
        body={error || activity?.errorState?.message}
        icon="activity"
        actionLabel={activity?.errorState?.retryLabel || 'Reintentar'}
        onAction={onRetry}
      />
    );
  }

  if (!activity?.hasItems) {
    return <ProfileShellPlaceholder title={activity?.emptyState?.title || 'Sin actividad por ahora'} body={activity?.emptyState?.message || 'Cuando empieces a jugar, tu timeline aparece acá.'} icon="activity" />;
  }

  return (
    <ProfileSectionCard>
      <View style={styles.timelineList}>
        {activity.items.map((item) => {
          const accentColor = item.outcome === 'positive'
            ? colors.success
            : item.outcome === 'win'
              ? colors.success
              : item.outcome === 'loss'
                ? colors.danger
                : colors.accent;
          const isMatch = item.kind === 'match_result';

          return (
            <TouchableOpacity
              key={item.id}
              disabled={!isMatch}
              onPress={() => isMatch && onMatchPress?.({ id: item.payload?.matchId })}
              style={[styles.timelineCard, { borderColor: colors.borderLight, borderRadius: themeRadius.lg, backgroundColor: colors.surfaceHighlight }]}
              accessibilityRole={isMatch ? 'button' : undefined}
              accessibilityLabel={isMatch ? `Abrir actividad ${item.title}` : item.title}
            >
              <View style={styles.timelineHeader}>
                <View style={[styles.timelineDot, { backgroundColor: accentColor }]} />
              <Text style={[typography.captionMedium, { color: colors.text.secondary }]}>{item.dateLabel || 'Ahora'}</Text>
              </View>

              <Text style={[typography.bodyBold, { color: colors.text.primary, marginTop: themeSpacing.xs }]}>{item.title}</Text>
              {item.payload?.subtitle ? (
                <Text style={[typography.body, { color: colors.text.secondary, marginTop: themeSpacing.xs }]}>{item.payload.subtitle}</Text>
              ) : null}
              {item.payload?.points || item.payload?.ratings ? (
                <Text style={[typography.caption, { color: colors.text.tertiary, marginTop: themeSpacing.sm }]}>
                  {item.payload?.points ? `${item.payload.points} pts competitivos` : `${item.payload.ratings} calificaciones registradas`}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </ProfileSectionCard>
  );
}

function ProfileSocialV2ShellContent({ navigation }) {
  const { logout } = useAuth();
  const { colors } = useTheme();
  const {
    loadingByBlock,
    errorByBlock,
    shellVM,
    highlightsVM,
    feedVM,
    activityVM,
    historyTabVM,
    historyVM,
    matches,
    refreshAll,
    retryBlock,
  } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(shellVM?.tabs?.[0]?.key || 'feed');

  useEffect(() => {
    if (!shellVM?.tabs?.some((tab) => tab.key === activeTab)) {
      setActiveTab(shellVM?.tabs?.[0]?.key || 'feed');
    }
  }, [activeTab, shellVM?.tabs]);

  const heroError = errorByBlock.identity || errorByBlock.ratings;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  const handleMatchPress = (match) => {
    if (!match?.id) return;
    navigation.navigate('Inicio', { screen: 'MatchDetail', params: { matchId: match.id } });
  };

  const handleActionPress = async (action) => {
    if (!action) return;

    if (action.key === 'edit') {
      navigation.navigate('EditProfile');
      return;
    }

    if (action.key === 'history') {
      openProfileHistory(navigation, historyVM, matches, loadingByBlock, errorByBlock);
      return;
    }

    if (action.key === 'share') {
      const message = [shellVM?.name || 'Mi perfil en Padex', shellVM?.handle, shellVM?.bio].filter(Boolean).join(' · ');

      try {
        await Share.share({
          title: 'Compartir perfil',
          message,
        });
      } catch (_) {
        Alert.alert('Compartir perfil', 'Todavía no pudimos abrir la hoja de compartir en este dispositivo.');
      }
    }
  };

  const shellSections = [
    { key: 'header', sticky: false },
    { key: 'hero', sticky: false },
    { key: 'about', sticky: false },
    { key: 'actions', sticky: false },
    { key: 'highlights', sticky: false },
    { key: 'tabs', sticky: true },
    { key: 'content', sticky: false },
  ];

  const stickyHeaderIndices = shellSections
    .map((section, index) => (section.sticky ? index : -1))
    .filter((index) => index >= 0);

  const renderShellContent = () => {
    if (activeTab === 'feed') {
      return (
        <ProfileFeedPreviewSection
          feed={feedVM}
          loading={loadingByBlock.matches}
          error={errorByBlock.matches}
          onRetry={() => retryBlock('matches')}
          onMatchPress={handleMatchPress}
        />
      );
    }

    if (activeTab === 'activity') {
      return (
        <ProfileActivityTimeline
          activity={activityVM}
          loading={loadingByBlock.matches}
          error={errorByBlock.matches}
          onRetry={() => retryBlock('matches')}
          onMatchPress={handleMatchPress}
        />
      );
    }

    return (
      <ProfileHistoryCTASection
        history={historyTabVM}
        loading={loadingByBlock.matches}
        error={errorByBlock.matches}
        onRetry={() => retryBlock('matches')}
        onPress={() => openProfileHistory(navigation, historyVM, matches, loadingByBlock, errorByBlock)}
        onMatchPress={handleMatchPress}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <Animated.FlatList
        data={shellSections}
        keyExtractor={(item) => item.key}
        stickyHeaderIndices={stickyHeaderIndices}
        extraData={activeTab}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.primary} />}
        contentContainerStyle={styles.shellListContent}
        renderItem={({ item, index }) => {
          if (item.key === 'header') {
            return (
              <View style={styles.headerRow}>
                <Text style={[typography.h1, { color: colors.text.primary }]} accessibilityRole="header">Perfil</Text>

                <TouchableOpacity
                  style={[styles.headerIconBtn, { borderColor: colors.borderLight, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
                  onPress={() => Alert.alert('¿Cerrar sesión?', '', [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Salir', style: 'destructive', onPress: logout },
                  ])}
                  accessibilityLabel="Cerrar sesión"
                  accessibilityHint="Cierra tu sesión actual de Padex"
                  accessibilityRole="button"
                >
                  <Feather name="log-out" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            );
          }

          if (item.key === 'hero') {
            return (
              <AnimatedProfileBlock index={index}>
                <View style={styles.content}>
                  <ProfileHeroSection
                    hero={shellVM}
                    loading={loadingByBlock.identity || loadingByBlock.ratings}
                    error={heroError}
                    onRetry={() => retryBlock(errorByBlock.identity ? 'identity' : 'ratings')}
                  />
                </View>
              </AnimatedProfileBlock>
            );
          }

          if (item.key === 'about') {
            return (
              <AnimatedProfileBlock index={index}>
                <View style={styles.content}>
                  <ProfileInfoSection
                    info={{
                      meta: shellVM?.meta,
                      fallback: {
                        title: 'Tu perfil recién empieza',
                        message: 'Completá ciudad, club o posición para mostrar mejor tu estilo de juego.',
                      },
                    }}
                    loading={loadingByBlock.identity}
                    error={errorByBlock.identity}
                    onRetry={() => retryBlock('identity')}
                  />
                </View>
              </AnimatedProfileBlock>
            );
          }

          if (item.key === 'actions') {
            return (
              <AnimatedProfileBlock index={index}>
                <View style={styles.content}>
                  <ProfileSocialSection
                    social={{
                      actions: shellVM?.actions,
                      onAction: handleActionPress,
                    }}
                    loading={loadingByBlock.identity}
                    error={errorByBlock.identity}
                    onRetry={() => retryBlock('identity')}
                  />
                </View>
              </AnimatedProfileBlock>
            );
          }

          if (item.key === 'highlights') {
            return (
              <AnimatedProfileBlock index={index}>
                <ProfileHighlightsRail highlights={highlightsVM} loading={loadingByBlock.matches || loadingByBlock.identity || loadingByBlock.ratings} navigation={navigation} />
              </AnimatedProfileBlock>
            );
          }

          if (item.key === 'tabs') {
            return <ProfileShellTabs tabs={shellVM?.tabs || []} activeTab={activeTab} onChange={setActiveTab} />;
          }

          return (
            <AnimatedProfileBlock index={index}>
              <View style={styles.content}>{renderShellContent()}</View>
            </AnimatedProfileBlock>
          );
        }}
        ListFooterComponent={<View style={styles.bottomSpacer} />}
      />
    </SafeAreaView>
  );
}

function ProfileInstagramV1StackContent({ navigation }) {
  const { logout } = useAuth();
  const { colors } = useTheme();
  const {
    loadingByBlock,
    errorByBlock,
    heroVM,
    infoVM,
    socialVM,
    feedPreviewVM,
    historyVM,
    matches,
    refreshAll,
    retryBlock,
  } = useProfile();

  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  const heroError = errorByBlock.identity || errorByBlock.ratings;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text.primary} />}
      >
        <View style={styles.headerRow}>
          <Text style={[typography.h1, { color: colors.text.primary }]} accessibilityRole="header">Perfil</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.headerBtn, { borderColor: colors.borderLight, backgroundColor: colors.surfaceHighlight }]}
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityLabel="Editar perfil"
              accessibilityHint="Abre la edición de tus datos de perfil"
              accessibilityRole="button"
            >
              <Feather name="edit-2" size={14} color={colors.text.primary} />
              <Text style={[typography.captionMedium, { color: colors.text.primary, marginLeft: 6 }]}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.headerBtn, { borderColor: colors.borderLight, backgroundColor: 'rgba(239, 68, 68, 0.05)' }]}
              onPress={() => Alert.alert('¿Cerrar sesión?', '', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Salir', style: 'destructive', onPress: logout },
              ])}
              accessibilityLabel="Cerrar sesión"
              accessibilityHint="Cierra tu sesión actual de Padex"
              accessibilityRole="button"
            >
              <Feather name="log-out" size={14} color={colors.danger} />
              <Text style={[typography.captionMedium, { color: colors.danger, marginLeft: 6 }]}>Salir</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>
          <AnimatedProfileBlock index={0}>
            <ProfileHeroSection
              hero={heroVM}
              loading={loadingByBlock.identity || loadingByBlock.ratings}
              error={heroError}
              onRetry={() => retryBlock(errorByBlock.identity ? 'identity' : 'ratings')}
            />
          </AnimatedProfileBlock>

          <AnimatedProfileBlock index={1}>
            <ProfileInfoSection
              info={infoVM}
              loading={loadingByBlock.identity}
              error={errorByBlock.identity}
              onRetry={() => retryBlock('identity')}
            />
          </AnimatedProfileBlock>

          <AnimatedProfileBlock index={2}>
            <ProfileSocialSection
              social={socialVM}
              loading={loadingByBlock.identity}
              error={errorByBlock.identity}
              onRetry={() => retryBlock('identity')}
              onEditProfile={() => navigation.navigate('EditProfile')}
            />
          </AnimatedProfileBlock>

          <AnimatedProfileBlock index={3}>
            <ProfileFeedPreviewSection
              feed={feedPreviewVM}
              loading={loadingByBlock.matches}
              error={errorByBlock.matches}
              onRetry={() => retryBlock('matches')}
              onMatchPress={(match) => navigation.navigate('Inicio', { screen: 'MatchDetail', params: { matchId: match.id } })}
            />
          </AnimatedProfileBlock>

          <AnimatedProfileBlock index={4}>
            <ProfileHistoryCTASection
              history={historyVM}
              onPress={() => openProfileHistory(navigation, historyVM, matches, loadingByBlock, errorByBlock)}
            />
          </AnimatedProfileBlock>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

export default function ProfileInstagramV1Screen({ variant = 'v1', ...props }) {
  return <ProfileProvider>{variant === 'v2' ? <ProfileSocialV2ShellContent {...props} /> : <ProfileInstagramV1StackContent {...props} />}</ProfileProvider>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.full,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
  },
  content: {
    paddingHorizontal: screenPadding.horizontal,
  },
  shellListContent: {
    paddingBottom: 0,
  },
  railCard: {
    marginHorizontal: screenPadding.horizontal,
  },
  railLabel: {
    marginBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  railItem: {
    width: 92,
    alignItems: 'center',
    paddingBottom: spacing.xs,
  },
  railAvatar: {
    width: 64,
    height: 64,
    borderWidth: 1,
    marginBottom: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  railBar: {
    width: 48,
    height: 8,
  },
  railTitle: {
    textAlign: 'center',
  },
  railSubtitle: {
    textAlign: 'center',
    marginTop: 2,
  },
  emptyRailCard: {
    borderWidth: 1,
    padding: spacing.md,
    marginHorizontal: screenPadding.horizontal,
  },
  tabsShell: {
    paddingHorizontal: screenPadding.horizontal,
    paddingTop: spacing.xs,
  },
  tabsRow: {
    flexDirection: 'row',
    borderWidth: 1,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
  },
  placeholderCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  placeholderIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderAction: {
    minHeight: 44,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  timelineList: {
    gap: spacing.sm,
  },
  timelineCard: {
    minHeight: 88,
    borderWidth: 1,
    padding: spacing.md,
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  bottomSpacer: {
    height: 120,
  },
});
