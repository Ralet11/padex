# Proposal: Mobile Visual and Functional Polish Unification

## Intent

The mobile app suffers from fragmented UI patterns: duplicate component libraries (legacy `components/` vs new `components/ui/`), pervasive hardcoded colors bypassing the theme system, inconsistent typography usage, missing loading/error states, accessibility gaps, and broken light theme coherence. This change unifies all screens to a single canonical UI system with consistent theme-aware components, proper feedback states, and full accessibility compliance.

## Scope

### In Scope
- Consolidate ALL screens to use only `components/ui/` components (Button, Card, Input, Typography, Avatar, Badge)
- Replace all hardcoded colors with theme tokens via `useTheme()`
- Add loading skeletons to data-fetching screens (Home, Social, Messages, Leaderboard, PlayerProfile)
- Add inline error UI with retry actions to all screens
- Add pull-to-refresh to Leaderboard screen
- Fix all touch targets to meet 44px minimum
- Add accessibility labels to all interactive elements
- Fix light theme coherence across every screen
- Replace emoji-based Alert feedback with standardized toast/banner pattern
- Fix encoding bug in SocialScreen Compañeros tab
- Remove deprecated `typography.button` references

### Out of Scope
- Backend API changes
- New feature development beyond polish
- Performance optimization (separate concern)
- Test framework installation (prerequisite for TDD)
- Removal of legacy component files (deprecate, don't delete)

## Approach

**Phase 1 — Component Unification**
- Audit every screen import; replace legacy components with `ui/` equivalents
- Map legacy component props to new APIs (Button variants, Card patterns)
- Verify no direct `Text`, `TouchableOpacity`, or `TextInput` outside `ui/`

**Phase 2 — Theme Integration**
- Replace all hardcoded color values with `useTheme()` tokens
- Fix light theme: Leaderboard, SystemBars, App shell background
- Ensure both themes produce coherent, accessible color contrast

**Phase 3 — Feedback States**
- Implement skeleton components for loading states
- Add inline error components with retry callbacks
- Standardize success feedback (toast/banner replacing Alert with emoji)

**Phase 4 — UX Polish**
- Fix touch targets: increase padding or add hitSlop to meet 44px minimum
- Add `accessibilityLabel` to all interactive elements
- Fix encoding bug in SocialScreen (UTF-8 handling)
- Add pull-to-refresh to Leaderboard

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `mobile/src/screens/home/` | Modified | Add loading/error states, theme integration |
| `mobile/src/screens/social/` | Modified | Fix encoding, add loading/error states, theme |
| `mobile/src/screens/messages/` | Modified | Add error UI, theme integration |
| `mobile/src/screens/leaderboard/` | Modified | Add pull-to-refresh, loading/error states, fix light theme |
| `mobile/src/screens/profile/` | Modified | Add loading/error states, theme integration |
| `mobile/src/screens/matches/` | Modified | Theme integration, touch targets |
| `mobile/src/components/ui/` | Extended | Add skeleton, toast, error components |
| `mobile/src/theme/` | Modified | Verify all tokens valid, remove non-existent refs |
| `mobile/App.js` | Modified | Fix SystemBars and shell background for light theme |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Breaking existing UI during migration | Medium | Screen-by-screen migration with visual regression checks |
| Theme token gaps (missing tokens for needed colors) | Low | Extend token set before migration begins |
| Accessibility regression during refactor | Medium | Validate with screen reader after each screen |
| Performance impact from skeleton animations | Low | Use lightweight shimmer, not heavy animations |

## Rollback Plan

Each screen migration is independent. If a screen breaks:
1. Revert that screen's imports to legacy components
2. Re-enable hardcoded colors for that screen only
3. File a follow-up issue for that specific screen
No full rollback needed—changes are modular.

## Dependencies

- Existing `components/ui/` library (already present)
- Existing `theme/` token system (already present)
- No external package installations required

## Success Criteria

- [ ] Zero legacy component imports across all screens
- [ ] Zero hardcoded color values outside `theme/` directory
- [ ] Every data-fetching screen has loading skeleton and error UI
- [ ] Leaderboard has pull-to-refresh with accent-colored indicator
- [ ] All touch targets meet 44px minimum
- [ ] All interactive elements have `accessibilityLabel`
- [ ] Light and dark themes render coherently on every screen
- [ ] No `typography.button` or non-existent token references
- [ ] SocialScreen encoding bug resolved
- [ ] No emoji in Alert titles; standardized feedback pattern in place
