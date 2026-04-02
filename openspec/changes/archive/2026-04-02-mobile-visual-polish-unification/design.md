# Design: Mobile Visual and Functional Polish Unification

## Technical Approach

Incremental screen-by-screen migration from legacy components and hardcoded styles to the canonical `components/ui/` library with `useTheme()` integration. Each screen is migrated independently in dependency order (atomic shared components first, then screens from highest-impact to lowest-risk). New shared primitives (`ScreenWrapper`, `Skeleton`, `ErrorState`, `SuccessToast`) are created upfront in `components/ui/` so screens can consume them immediately.

## Architecture Decisions

### Decision: ScreenWrapper over per-screen SafeAreaView + padding

**Choice**: Create `ScreenWrapper` component that encapsulates `SafeAreaView`, background color, header spacing, and horizontal padding.

**Alternatives considered**: Keep duplicating SafeAreaView + screenPadding.horizontal + spacing.xl/spacing.lg pattern per screen.

**Rationale**: Every screen repeats the same 4-line pattern (`SafeAreaView` with `backgroundColor`, `edges={['top']}`, `paddingHorizontal: screenPadding.horizontal`, `paddingTop: spacing.xl`). A wrapper removes ~15 lines per screen and guarantees consistency. The auth screens use `AuthShell` (different layout) and will NOT use ScreenWrapper.

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Per-screen duplication | Flexible but error-prone | Rejected |
| ScreenWrapper + optional scroll prop | Slight abstraction cost, massive consistency gain | **Chosen** |

### Decision: Skeleton shimmer via native Animated (not Reanimated)

**Choice**: Build skeleton with `Animated.View` + `opacity` pulse, no react-native-reanimated dependency.

**Alternatives considered**: react-native-reanimated shimmer gradient, react-native-skeleton-placeholder.

**Rationale**: The project already uses `Animated` for Button micro-interactions (to avoid Reanimated native crashes). Keeping the same library avoids adding dependencies. A simple opacity pulse is performant enough for the loading duration.

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Reanimated gradient | Better visual, adds native dep + crash risk | Rejected |
| Third-party skeleton | Adds dependency, may not match theme | Rejected |
| Animated opacity pulse | Minimal visual, zero deps, safe | **Chosen** |

### Decision: InlineError component over Alert.alert

**Choice**: Create `InlineError` component with icon, message, and retry button. Renders inside the screen layout.

**Alternatives considered**: Keep using `Alert.alert('Error', message)` for errors.

**Rationale**: Specs explicitly prohibit silent `console.error` without user-facing feedback, and Alert blocks the UI thread. Inline errors are contextual, non-blocking, and provide retry affordance. Alert remains for destructive confirmations only.

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Alert.alert | Simple but blocks UI, no retry | Rejected |
| InlineError + retry | Requires screen layout changes, provides retry + context | **Chosen** |

### Decision: SuccessToast as Context-based overlay

**Choice**: Create `ToastProvider` + `useToast()` hook that renders a time-limited banner. Replaces `Alert.alert('✅', 'Success')`.

**Alternatives considered**: Inline success state per screen, react-native-toast-message library.

**Rationale**: Mutation success feedback is cross-cutting — it fires after join, leave, create, rate, connect, save. A context-based toast avoids duplicating state per screen. No third-party dep needed since the implementation is ~60 lines.

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Per-screen success state | Duplicated logic across 8+ screens | Rejected |
| react-native-toast-message | Good DX but adds dep for simple use case | Rejected |
| Context-based ToastProvider | Zero deps, one implementation, all screens benefit | **Chosen** |

### Decision: Migrate PlayerProfileScreen to theme context (was static import)

**Choice**: Refactor `PlayerProfileScreen` to use `useTheme()` hook instead of `import { colors } from '../../theme'`.

**Alternatives considered**: Keep legacy static import, add `useTheme` only for new screens.

**Rationale**: `PlayerProfileScreen` is the ONLY screen using the static `colors` import. Using `useTheme()` is required for dark/light toggle to work. This is a one-line pattern change with massive impact on theme coherence.

## Data Flow

    useTheme() ──→ ScreenWrapper ──→ screen content
         │                                │
         ├─→ Skeleton (loading=true)      │
         ├─→ InlineError (error exists)   │
         └─→ actual content (success)     │
                                          │
    useToast() ──→ SuccessToast (overlay) ─┘

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `mobile/src/components/ui/ScreenWrapper.js` | Create | SafeAreaView + background + padding wrapper |
| `mobile/src/components/ui/Skeleton.js` | Create | Animated opacity pulse skeleton system |
| `mobile/src/components/ui/InlineError.js` | Create | Error state with retry callback |
| `mobile/src/components/ui/SuccessToast.js` | Create | Toast context + provider + banner |
| `mobile/src/components/ui/index.js` | Create | Barrel export for all ui/ components |
| `mobile/src/screens/home/HomeScreen.js` | Modify | Migrate to ui/ components, add Skeleton + InlineError |
| `mobile/src/screens/home/MatchDetailScreen.js` | Modify | Migrate legacy Button/Avatar, add Skeleton + InlineError |
| `mobile/src/screens/matches/CreateMatchScreen.js` | Modify | Migrate legacy Button/Input, add InlineError |
| `mobile/src/screens/social/SocialScreen.js` | Modify | Migrate legacy Button, add Skeleton + InlineError |
| `mobile/src/screens/social/PlayerProfileScreen.js` | Modify | Refactor to useTheme(), migrate all components |
| `mobile/src/screens/profile/ProfileScreen.js` | Modify | Migrate legacy Avatar/MatchCard refs, add Skeleton |
| `mobile/src/screens/profile/EditProfileScreen.js` | Modify | Migrate legacy Button/Input/Avatar |
| `mobile/src/screens/leaderboard/LeaderboardScreen.js` | Modify | Add pull-to-refresh, Skeleton, InlineError, fix theme |
| `mobile/src/screens/messages/MessagesScreen.js` | Modify | Add Skeleton + InlineError |
| `mobile/src/screens/messages/ChatScreen.js` | Modify | Migrate to theme tokens, add InlineError |
| `mobile/src/screens/SplashScreen.js` | Modify | Replace hardcoded gradient colors |
| `mobile/App.js` | Modify | Add ToastProvider, fix SystemBars for light mode |

## Interfaces / Contracts

```javascript
// ScreenWrapper
<ScreenWrapper scroll edges={['top']}>
  {children}
</ScreenWrapper>

// Skeleton
<Skeleton lines={3} avatar width="100%" />

// InlineError
<InlineError message="No se pudieron cargar los partidos" onRetry={fetchMatches} />

// SuccessToast
const { show } = useToast();
show('Partido creado exitosamente');  // auto-dismisses after 3s
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Visual | Light+dark theme on every screen | Manual toggle verification per screen |
| Functional | Loading → content transition | Verify no layout shift when skeleton disappears |
| Functional | Error → retry → loading → content | Trigger API error, tap retry, verify flow |
| Functional | Toast auto-dismiss | Trigger mutation, verify toast disappears after 3s |
| Accessibility | Touch targets ≥ 44px | Manual measurement on all interactive elements |
| Regression | All existing flows still work | Join match, create match, send message, edit profile |

## Migration / Rollout

Screen migration order (highest-impact to lowest-risk):

| Order | Screen | Rationale |
|-------|--------|-----------|
| 1 | `components/ui/` — new primitives | Foundation: Skeleton, InlineError, ScreenWrapper, Toast must exist first |
| 2 | HomeScreen | Highest-visibility screen, most users see it first |
| 3 | MatchDetailScreen | Core flow, heavy use of legacy Button/Avatar |
| 4 | CreateMatchScreen | Core flow, legacy Button/Input |
| 5 | SocialScreen | Has encoding bug fix + legacy Button |
| 6 | PlayerProfileScreen | Static theme import (theme toggle broken) |
| 7 | ProfileScreen | Legacy Avatar, user's own profile |
| 8 | EditProfileScreen | Legacy Button/Input/Avatar |
| 9 | LeaderboardScreen | Needs pull-to-refresh + theme fix + Skeleton |
| 10 | MessagesScreen | Simple, low risk |
| 11 | ChatScreen | Complex layout, lowest risk to break |
| 12 | App.js + ToastProvider | Shell-level integration last |

Each screen migration follows this checklist per screen:
1. Replace all legacy imports with `ui/` imports
2. Replace hardcoded colors with `useTheme()` tokens
3. Wrap content in `ScreenWrapper`
4. Replace `ActivityIndicator` / "Cargando..." with `Skeleton`
5. Replace `console.error` + no feedback with `InlineError`
6. Replace `Alert.alert('✅', ...)` with `useToast().show()`
7. Verify in both light + dark themes

## Open Questions

- [ ] Should `MatchCard` and `PlayerCard` also be migrated to use `ui/` components internally, or only screen-level imports?
- [ ] `ChatScreen` uses a `createStyles(colors, spacing, radius, insets)` pattern (dynamic styles) — should this be kept or refactored to static StyleSheet + useTheme?
- [ ] Should legacy component files (`components/Button.js`, `components/Input.js`, `components/Avatar.js`) get a deprecation comment or be deleted after full migration?
