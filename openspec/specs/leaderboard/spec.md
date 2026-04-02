# Leaderboard Specification

## Purpose

The leaderboard screen SHALL support pull-to-refresh to allow users to manually refresh ranking data.

## Requirements

### Requirement: Pull-to-Refresh

The LeaderboardScreen SHALL implement pull-to-refresh using `RefreshControl`. The refresh indicator MUST use the theme's accent color.

#### Scenario: User pulls to refresh

- GIVEN the leaderboard is displaying data
- WHEN the user pulls down past the threshold
- THEN a refresh indicator appears with the accent color
- AND data is re-fetched from the API

#### Scenario: Refresh completes

- GIVEN a refresh is in progress
- WHEN the API returns fresh data
- THEN the list updates with new rankings
- AND the refresh indicator stops animating

#### Scenario: Refresh fails

- GIVEN a refresh is triggered
- WHEN the API call fails
- THEN the refresh indicator stops
- AND an inline error message is shown (per ui-compliance error spec)

#### Scenario: Empty leaderboard on refresh

- GIVEN the leaderboard is empty
- WHEN the user pulls to refresh
- THEN the refresh triggers
- AND an empty state message is shown if still empty after refresh
