import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { screenPadding } from '../../theme/layout';
import { Typography } from '../ui/Typography';

const PATTERN_SHAPES = [
  { top: 12, left: 18, width: 54, height: 54, borderRadius: 20, backgroundColor: '#17181B' },
  { top: 18, left: 78, width: 48, height: 48, borderRadius: 24, backgroundColor: '#121316' },
  { top: 0, left: 136, width: 64, height: 64, borderRadius: 22, backgroundColor: '#1A1B1F' },
  { top: 8, right: 26, width: 50, height: 50, borderRadius: 18, backgroundColor: '#17181B' },
  { top: 62, left: 28, width: 68, height: 68, borderRadius: 24, backgroundColor: '#101114' },
  { top: 76, left: 108, width: 42, height: 42, borderRadius: 14, backgroundColor: '#18191D' },
  { top: 58, right: 84, width: 54, height: 54, borderRadius: 27, backgroundColor: '#131417' },
  { top: 86, right: 28, width: 58, height: 58, borderRadius: 18, backgroundColor: '#1B1C20' },
  { top: 124, left: 72, width: 48, height: 48, borderRadius: 24, backgroundColor: '#15161A' },
  { top: 126, right: 124, width: 44, height: 44, borderRadius: 16, backgroundColor: '#111216' },
];

function HeaderPattern({ accentColor }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {PATTERN_SHAPES.map((shape, index) => (
        <View key={index} style={[styles.patternShape, shape]} />
      ))}
      <View style={[styles.patternGlow, { backgroundColor: accentColor }]} />
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
}) {
  const { colors, spacing, radius, shadows } = useTheme();
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset((event.endCoordinates?.height ?? 0) + spacing.md);
    });

    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [spacing.md]);

  return (
    <LinearGradient colors={['#F7F8FB', '#EEF1F6']} style={styles.gradient}>
      <StatusBar style="dark" hidden={false} />
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
          style={styles.flex}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingHorizontal: screenPadding.horizontal,
                paddingTop: keyboardInset ? spacing.md : spacing.lg,
                paddingBottom: Math.max(spacing.xl, keyboardInset),
                justifyContent: keyboardInset ? 'flex-start' : 'center',
              },
              scrollContentStyle,
            ]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
            contentInsetAdjustmentBehavior="always"
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
                <View
                  style={[
                    styles.header,
                    {
                      paddingHorizontal: spacing.lg,
                      paddingTop: spacing.lg,
                      paddingBottom: spacing.xxl,
                      borderTopLeftRadius: radius.xxl + 4,
                      borderTopRightRadius: radius.xxl + 4,
                    },
                  ]}
                >
                  <HeaderPattern accentColor={`${colors.accent}22`} />

                  <View style={styles.headerTopRow}>
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

                  {headerContent}
                </View>

                <View
                  style={[
                    styles.body,
                    {
                      marginTop: -(spacing.xl + spacing.xs),
                      paddingHorizontal: spacing.lg,
                      paddingTop: spacing.xl,
                      paddingBottom: spacing.lg,
                      borderTopLeftRadius: radius.xxl + 8,
                      borderTopRightRadius: radius.xxl + 8,
                    },
                    bodyStyle,
                  ]}
                >
                  {title ? (
                    <Typography variant="h2" align="center" style={styles.bodyTitle}>
                      {title}
                    </Typography>
                  ) : null}

                  {subtitle ? (
                    <Typography
                      variant="body"
                      align="center"
                      style={[styles.bodySubtitle, { color: colors.text.secondary }]}
                    >
                      {subtitle}
                    </Typography>
                  ) : null}

                  {children}

                  {footer ? <View style={styles.footer}>{footer}</View> : null}
                </View>
              </View>
            </View>
          </ScrollView>
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
    width: 180,
    height: 180,
    top: -28,
    left: -34,
  },
  bgOrbRight: {
    width: 150,
    height: 150,
    bottom: 28,
    right: -24,
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
  patternShape: {
    position: 'absolute',
    opacity: 0.94,
  },
  patternGlow: {
    position: 'absolute',
    top: 18,
    right: 62,
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  body: {
    backgroundColor: '#FFFEFD',
  },
  bodyTitle: {
    color: '#17181B',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  bodySubtitle: {
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  footer: {
    marginTop: 22,
  },
});
