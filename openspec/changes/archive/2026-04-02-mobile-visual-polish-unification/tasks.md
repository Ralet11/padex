# Tasks: Mobile Visual and Functional Polish Unification

## Phase 1: Foundation — New UI Primitives

- [x] 1.1 Create `mobile/src/components/ui/ScreenWrapper.js` — SafeAreaView + theme background + horizontal padding + header spacing wrapper. Accepts `scroll` and `edges` props.
- [x] 1.2 Create `mobile/src/components/ui/Skeleton.js` — Animated opacity pulse skeleton system using native `Animated.View`. Accepts `lines`, `avatar`, `width` props.
- [x] 1.3 Create `mobile/src/components/ui/InlineError.js` — Error state component with icon, message text, and retry button. Accepts `message` and `onRetry` props.
- [x] 1.4 Create `mobile/src/components/ui/SuccessToast.js` — ToastProvider context + useToast() hook + time-limited banner overlay (3s auto-dismiss).
- [x] 1.5 Create `mobile/src/components/ui/index.js` — Barrel export for ScreenWrapper, Skeleton, InlineError, SuccessToast and all existing ui/ components.

**Done criteria**: All 5 files exist, no import errors, barrel exports resolve correctly.

## Phase 2: Core Screens (High Visibility + Heavy Legacy)

- [x] 2.1 Migrate `mobile/src/screens/home/HomeScreen.js` — Replace legacy Button/Card/Typography with ui/ imports. Add Skeleton loading state + InlineError. Replace hardcoded colors with useTheme().
- [x] 2.2 Migrate `mobile/src/screens/home/MatchDetailScreen.js` — Replace legacy Button/Avatar. Add Skeleton + InlineError. Ensure 44px touch targets on all interactive elements.
- [x] 2.3 Migrate `mobile/src/screens/matches/CreateMatchScreen.js` — Replace legacy Button/Input. Add InlineError for form submission failures. Replace all hardcoded colors.
- [x] 2.4 Migrate `mobile/src/screens/social/SocialScreen.js` — Replace legacy Button. Fix encoding bug (UTF-8, not Latin-1). Add Skeleton + InlineError. Verify accented text renders correctly.
- [x] 2.5 Migrate `mobile/src/screens/social/PlayerProfileScreen.js` — Refactor from static `import { colors }` to `useTheme()`. Migrate all legacy components. Add Skeleton loading state.

**Done criteria**: Zero legacy imports in all 5 screens. All colors from useTheme(). Loading/error states functional. Encoding bug fixed.

## Phase 3: Secondary Screens + Leaderboard

- [x] 3.1 Migrate `mobile/src/screens/profile/ProfileScreen.js` — Replace legacy Avatar/MatchCard references. Add Skeleton loading. Use useTheme() tokens exclusively.
- [x] 3.2 Migrate `mobile/src/screens/profile/EditProfileScreen.js` — Replace legacy Button/Input/Avatar. Add InlineError for save failures. Verify 44px touch targets.
- [x] 3.3 Migrate `mobile/src/screens/leaderboard/LeaderboardScreen.js` — Add pull-to-refresh with accent-colored RefreshControl. Add Skeleton + InlineError. Fix light theme colors.
- [x] 3.4 Migrate `mobile/src/screens/messages/MessagesScreen.js` — Add Skeleton loading + InlineError. Replace any hardcoded colors with useTheme().
- [x] 3.5 Migrate `mobile/src/screens/messages/ChatScreen.js` — Migrate to theme tokens. Add InlineError for send failures. Evaluate keep-vs-refactor of createStyles() pattern.

**Done criteria**: All 8 screens use ui/ components only. Leaderboard refresh works. Light theme coherent on leaderboard.

## Phase 4: Shell + Success Feedback + Accessibility

- [x] 4.1 Migrate `mobile/src/screens/SplashScreen.js` — Replace hardcoded gradient colors with theme tokens.
- [x] 4.2 Integrate ToastProvider in `mobile/App.js` — Wrap app with ToastProvider. Fix SystemBars for light mode. Ensure shell background respects theme.
- [x] 4.3 Add `accessibilityLabel` to all interactive elements across all migrated screens.
- [x] 4.4 Replace all emoji-based Alert.alert success feedback with useToast().show() calls.

**Done criteria**: ToastProvider active. SystemBars correct in both themes. All interactive elements have accessibility labels. No emoji in alerts.

## Phase 5: Theme Coherence Verification Pass

- [x] 5.1 Audit every screen file for remaining hardcoded hex colors, rgb() literals, or direct `colors.js` imports. Report and fix any violations.
- [x] 5.2 Remove all `typography.button` or non-existent token references from screen files.
- [x] 5.3 Verify light theme visual coherence on every screen (no white-on-white, no invisible cards, proper contrast).
- [x] 5.4 Verify dark theme visual coherence on every screen (contrast ratios, status colors visible).
- [x] 5.5 Confirm all raw `fontSize` literals removed from screen files (must use Typography tokens).

**Done criteria**: Zero hardcoded colors in screen files. Zero non-existent token refs. Both themes render coherently on all screens.

## Phase 6: Final Acceptance Checklist

- [x] 6.1 Verify zero legacy component imports across all screens (grep for `components/Button`, `components/Card`, `components/Input`, `components/Avatar`).
- [x] 6.2 Verify every data-fetching screen has Skeleton (loading) and InlineError (error) states.
- [x] 6.3 Verify LeaderboardScreen has pull-to-refresh with accent-colored indicator.
- [x] 6.4 Verify all touch targets meet 44px minimum on interactive elements.
- [x] 6.5 Verify SocialScreen encoding bug resolved (accented names render correctly).
- [x] 6.6 Verify no emoji in Alert titles; all success feedback uses toast pattern.
- [x] 6.7 Document deprecation of legacy component files (add TODO comments, do not delete).

**Done criteria**: All proposal success criteria pass. Screen-by-screen rollback not needed.
