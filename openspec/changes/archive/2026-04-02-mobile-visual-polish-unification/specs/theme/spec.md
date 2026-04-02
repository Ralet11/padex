# Theme Coherence Specification

## Purpose

Light and dark themes SHALL be visually coherent across every screen. No screen may use hardcoded colors that break theme consistency.

## Requirements

### Requirement: Theme-Aware Rendering

Every screen SHALL consume colors exclusively via `useTheme()` or the `Typography` component's `variant` prop. Inline hex colors, rgb() literals, or direct imports of `colors.js` in screen files are PROHIBITED.

#### Scenario: Screen uses useTheme colors

- GIVEN a screen is rendering
- WHEN inspecting its color usage
- THEN every color value comes from the theme context

#### Scenario: Theme switch updates all screens

- GIVEN the user toggles between light and dark mode
- WHEN the theme context updates
- THEN every visible screen re-renders with the correct theme colors
- AND no element retains the previous theme's colors

### Requirement: Contrast Compliance

All text on backgrounds SHALL meet WCAG AA contrast ratio (>= 4.5:1 for body text, >= 3:1 for large text) in both themes.

#### Scenario: Dark theme text contrast

- GIVEN dark theme is active
- WHEN measuring text-to-background contrast
- THEN body text achieves >= 4.5:1 ratio against its background

#### Scenario: Light theme text contrast

- GIVEN light theme is active
- WHEN measuring text-to-background contrast
- THEN body text achieves >= 4.5:1 ratio against its background

### Requirement: Visual Parity

No screen SHALL look "broken" or visually inconsistent in either theme. Borders, shadows, cards, and status indicators MUST be visible in both themes.

#### Scenario: Cards visible in both themes

- GIVEN a Card component is rendered
- WHEN switching between themes
- THEN the card is visually distinguishable from the background in both themes

#### Scenario: Status colors visible in both themes

- GIVEN a success/danger/warning indicator
- WHEN switching between themes
- THEN the status color remains visible and meaningful in both themes
