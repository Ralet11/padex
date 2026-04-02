# UI Compliance Specification

## Purpose

All mobile screens MUST use the canonical `components/ui/` library and `useTheme()` hook exclusively. No legacy components, hardcoded colors, or ad-hoc patterns are permitted.

## Requirements

### Requirement: Canonical Component Usage

All screens SHALL use only components exported from `components/ui/` (Button, Card, Input, Typography, Avatar, Badge). Direct usage of bare `Text`, `TouchableOpacity`, `TextInput`, or legacy components (e.g., `components/Button.js`) is PROHIBITED.

#### Scenario: Screen renders only ui/ components

- GIVEN a screen is being rendered
- WHEN inspecting the component tree
- THEN every interactive or presentational element originates from `components/ui/`
- AND no legacy or raw RN primitives are used

#### Scenario: Developer imports non-ui component

- GIVEN a developer imports `components/Button.js` (legacy)
- WHEN the import is evaluated
- THEN ESLint MUST flag it or code review SHALL reject it

### Requirement: Loading States

Every data-fetching screen SHALL display a skeleton or shimmer animation while loading. Raw text like "Cargando..." is PROHIBITED.

#### Scenario: Screen shows skeleton on mount

- GIVEN a screen with async data
- WHEN the screen mounts and data is pending
- THEN a skeleton/shimmer placeholder matching the content layout is displayed

#### Scenario: Screen transitions from skeleton to content

- GIVEN a skeleton is displayed
- WHEN data resolves successfully
- THEN the skeleton transitions to actual content without layout shift

### Requirement: Error UI

Every screen SHALL present inline error messaging to the user. Silent `console.error` without user-facing feedback is PROHIBITED.

#### Scenario: Error state renders inline message

- GIVEN a screen fetches data
- WHEN the request fails
- THEN an inline error message and retry action are visible to the user

#### Scenario: Retry after error

- GIVEN an error state is displayed
- WHEN the user taps retry
- THEN the loading state re-engages and data is re-fetched

### Requirement: Success Feedback

Every mutation action (create, update, delete) SHALL show a consistent success feedback pattern. Emoji in Alert titles or ad-hoc strings are PROHIBITED.

#### Scenario: Successful mutation shows feedback

- GIVEN a user completes a mutation action
- WHEN the API returns success
- THEN a standardized success toast/banner appears with a clear message

#### Scenario: Feedback dismisses automatically

- GIVEN a success feedback is displayed
- WHEN 3 seconds elapse OR user navigates away
- THEN the feedback auto-dismisses without blocking UI

### Requirement: Touch Targets

All interactive elements (buttons, links, inputs) SHALL have a minimum touch area of 44x44 logical pixels.

#### Scenario: Button meets minimum size

- GIVEN any tappable element on screen
- WHEN measuring the hit area
- THEN both width and height are >= 44px

#### Scenario: Small icon wrapped in hitSlop

- GIVEN an icon-only button smaller than 44px
- WHEN the touch target is measured
- THEN hitSlop or padding extends the touch area to >= 44px

### Requirement: Accessibility Labels

All interactive elements SHALL have a `testID` and/or `accessibilityLabel` for screen readers and automation.

#### Scenario: Button has accessibility label

- GIVEN any interactive element
- WHEN rendered
- THEN it has a descriptive `accessibilityLabel` in the correct language

#### Scenario: Image has accessibility label

- GIVEN an informational image or avatar
- WHEN rendered
- THEN it has an `accessibilityLabel` describing its content

### Requirement: Typography Tokens

All text rendered on screen SHALL use `Typography` from `components/ui/` or reference defined tokens from `theme/typography.js`. Raw `fontSize` or non-existent token references are PROHIBITED.

#### Scenario: Text uses Typography component

- GIVEN any text element on screen
- WHEN inspecting its style
- THEN it uses a valid token (h1-h3, subtitle, body, bodyLarge, bodyMedium, bodyBold, caption, captionMedium, label)

#### Scenario: No raw fontSize in screen code

- GIVEN a screen file
- WHEN searching for `fontSize` literals
- THEN none are found outside of `components/ui/` or `theme/`
