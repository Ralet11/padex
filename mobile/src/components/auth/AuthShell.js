import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { screenPadding } from '../../theme/layout';
import { Typography } from '../ui/Typography';
import { AuthKeyboardContext } from './AuthKeyboardContext';

function HeaderPattern({ accentColor }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.patternAccentOrb, { backgroundColor: accentColor }]} />
      <View style={styles.patternSoftOrb} />
      <View style={styles.patternPanelWide} />
      <View style={styles.patternPanelTall} />
      <View style={styles.patternCourtLineHorizontal} />
      <View style={styles.patternCourtLineVertical} />
      <View style={styles.patternCourtArc} />
    </View>
  );
}

export default function AuthShell({
  title,
  subtitle,
  headerTitle,
  headerContent,
  onBackPress,
  children,
  footer,
  bodyStyle,
  scrollContentStyle,
  density = 'default',
}) {
  const { colors, spacing, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardInset, setKeyboardInset] = useState(0);
  const keyboardTopRef = useRef(null);
  const scrollRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const isKeyboardVisible = keyboardInset > 0;
  const isCompact = density === 'compact';
  const showHeaderTopRow = Boolean(onBackPress || headerTitle);

  const scrollPaddingTop = isKeyboardVisible
    ? spacing.sm
    : isCompact
      ? spacing.sm
      : spacing.lg;
  const scrollPaddingBottom = Math.max(isCompact ? spacing.lg : spacing.xl, keyboardInset);
  const headerMinHeight = isKeyboardVisible
    ? isCompact
      ? 156
      : 168
    : isCompact
      ? 196
      : 208;
  const headerPaddingTop = isCompact ? spacing.md : spacing.lg;
  const headerPaddingBottom = isKeyboardVisible
    ? isCompact
      ? spacing.md
      : spacing.lg
    : isCompact
      ? spacing.lg + spacing.sm
      : spacing.xxl;
  const bodyMarginTop = -(isKeyboardVisible
    ? isCompact
      ? spacing.md
      : spacing.lg
    : isCompact
      ? spacing.md + spacing.xs
      : spacing.xl + spacing.xs);
  const bodyPaddingHorizontal = isCompact ? spacing.md + 2 : spacing.lg;
  const bodyPaddingTop = isKeyboardVisible
    ? isCompact
      ? spacing.md
      : spacing.lg
    : isCompact
      ? spacing.lg
      : spacing.xl;
  const bodyPaddingBottom = isCompact ? spacing.md + 2 : spacing.lg;
  const headerTopRowMarginBottom = isCompact ? 2 : 8;
  const bodyTitleMarginBottom = isCompact ? 4 : 8;
  const bodySubtitleMarginBottom = isCompact ? 18 : 28;
  const footerMarginTop = isCompact ? 14 : 22;

  const scrollFocusedInputIntoView = useCallback(
    (inputHandle) => {
      if (!inputHandle?.measureInWindow || keyboardTopRef.current == null) return;

      requestAnimationFrame(() => {
        inputHandle.measureInWindow((x, y, width, height) => {
          const visibleTop = insets.top + spacing.sm;
          const visibleBottom = keyboardTopRef.current - spacing.md;
          const inputBottom = y + height;

          if (y < visibleTop) {
            const nextOffset = Math.max(0, scrollOffsetRef.current - (visibleTop - y));
            scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
            return;
          }

          if (inputBottom > visibleBottom) {
            const nextOffset = Math.max(0, scrollOffsetRef.current + (inputBottom - visibleBottom));
            scrollRef.current?.scrollTo({ y: nextOffset, animated: true });
          }
        });
      });
    },
    [insets.top, spacing.md, spacing.sm]
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      const nextKeyboardHeight = (event.endCoordinates?.height ?? 0) + spacing.md;
      const nextKeyboardTop =
        event.endCoordinates?.screenY ?? windowHeight - (event.endCoordinates?.height ?? 0);

      setKeyboardInset(nextKeyboardHeight);
      keyboardTopRef.current = nextKeyboardTop;

      const focusedInput = TextInput.State?.currentlyFocusedInput?.();
      const focusDelay = Platform.OS === 'android' ? 80 : 40;
      setTimeout(() => scrollFocusedInputIntoView(focusedInput), focusDelay);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
      keyboardTopRef.current = null;
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scrollFocusedInputIntoView, spacing.md, windowHeight]);

  return (
    <LinearGradient colors={['#F7F8FB', '#EEF1F6']} style={styles.gradient}>
      <StatusBar style="dark" hidden={false} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.flex}
        >
          <AuthKeyboardContext.Provider value={{ scrollFocusedInputIntoView }}>
            <ScrollView
              ref={scrollRef}
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingHorizontal: screenPadding.horizontal,
                  paddingTop: scrollPaddingTop,
                  paddingBottom: scrollPaddingBottom,
                  justifyContent: isKeyboardVisible ? 'flex-start' : 'center',
                },
                scrollContentStyle,
              ]}
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              contentInsetAdjustmentBehavior="always"
              onScroll={(event) => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              <View style={styles.stage}>
                <View style={[styles.bgOrb, styles.bgOrbLeft, { backgroundColor: `${colors.accent}26` }]} />
                <View style={[styles.bgOrb, styles.bgOrbRight, { backgroundColor: 'rgba(255,255,255,0.6)' }]} />

                <View
                  style={[
                    styles.frame,
                    {
                      borderRadius: radius.xxl + 4,
                      shadowColor: '#111827',
                      shadowOpacity: shadows.lg.shadowOpacity,
                      shadowRadius: 24,
                      shadowOffset: { width: 0, height: 14 },
                      elevation: shadows.lg.elevation + 2,
                    },
                  ]}
                >
                  <LinearGradient
                    colors={['#090A0E', '#11151E', '#0C1017']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.header,
                      {
                        minHeight: headerMinHeight,
                        paddingHorizontal: spacing.lg,
                        paddingTop: headerPaddingTop,
                        paddingBottom: headerPaddingBottom,
                        borderTopLeftRadius: radius.xxl + 4,
                        borderTopRightRadius: radius.xxl + 4,
                      },
                    ]}
                  >
                    <HeaderPattern accentColor={`${colors.accent}22`} />

                    {showHeaderTopRow ? (
                      <View style={[styles.headerTopRow, { marginBottom: headerTopRowMarginBottom }]}>
                        <View style={styles.headerActionSlot}>
                          {onBackPress ? (
                            <TouchableOpacity
                              accessibilityLabel="Volver"
                              accessibilityRole="button"
                              activeOpacity={0.8}
                              onPress={onBackPress}
                              style={styles.backButton}
                            >
                              <ChevronLeft color="#F4F4F5" size={18} />
                            </TouchableOpacity>
                          ) : null}
                        </View>

                        {headerTitle ? (
                          <Typography
                            variant="h3"
                            weight="medium"
                            align="center"
                            style={styles.headerTitle}
                          >
                            {headerTitle}
                          </Typography>
                        ) : (
                          <View style={styles.headerTitleSpacer} />
                        )}

                        <View style={styles.headerActionSlot} />
                      </View>
                    ) : null}

                    {headerContent}
                  </LinearGradient>

                  <View
                    style={[
                      styles.body,
                      {
                        marginTop: bodyMarginTop,
                        paddingHorizontal: bodyPaddingHorizontal,
                        paddingTop: bodyPaddingTop,
                        paddingBottom: bodyPaddingBottom,
                        borderTopLeftRadius: radius.xxl + 8,
                        borderTopRightRadius: radius.xxl + 8,
                      },
                      bodyStyle,
                    ]}
                  >
                    {title ? (
                      <Typography
                        variant="h2"
                        align="center"
                        style={[styles.bodyTitle, { marginBottom: bodyTitleMarginBottom }]}
                      >
                        {title}
                      </Typography>
                    ) : null}

                    {subtitle ? (
                      <Typography
                        variant="body"
                        align="center"
                        style={[
                          styles.bodySubtitle,
                          {
                            color: colors.text.secondary,
                            marginBottom: bodySubtitleMarginBottom,
                          },
                        ]}
                      >
                        {subtitle}
                      </Typography>
                    ) : null}

                    {children}

                    {footer ? <View style={[styles.footer, { marginTop: footerMarginTop }]}>{footer}</View> : null}
                  </View>
                </View>
              </View>
            </ScrollView>
          </AuthKeyboardContext.Provider>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  stage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgOrb: {
    position: 'absolute',
    borderRadius: 999,
  },
  bgOrbLeft: {
    width: 168,
    height: 168,
    top: -14,
    left: -26,
  },
  bgOrbRight: {
    width: 132,
    height: 132,
    bottom: 42,
    right: -18,
  },
  frame: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0B0B0D',
    minHeight: 208,
    overflow: 'hidden',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
    marginBottom: 8,
  },
  headerActionSlot: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: {
    flex: 1,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerTitleSpacer: {
    flex: 1,
  },
  patternAccentOrb: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 999,
    top: -18,
    right: -26,
    opacity: 0.18,
  },
  patternSoftOrb: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    bottom: -26,
    left: -18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  patternPanelWide: {
    position: 'absolute',
    top: 22,
    left: 18,
    width: '66%',
    height: 82,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  patternPanelTall: {
    position: 'absolute',
    top: 54,
    right: 18,
    width: 88,
    height: 94,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  patternCourtLineHorizontal: {
    position: 'absolute',
    left: 26,
    right: 26,
    bottom: 54,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  patternCourtLineVertical: {
    position: 'absolute',
    top: 34,
    bottom: 34,
    left: '50%',
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  patternCourtArc: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    bottom: -80,
    left: 22,
  },
  body: {
    backgroundColor: '#FFFEFD',
  },
  bodyTitle: {
    color: '#17181B',
    letterSpacing: -0.5,
  },
  bodySubtitle: {
    paddingHorizontal: 8,
  },
  footer: {},
});
