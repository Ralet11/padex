# Competitive and Operational Domain Specification

## Purpose

Define the authoritative competitive contract for PADEX so backend, mobile, and partners-web share one competitive vocabulary, one slot/match lifecycle, and one clear boundary between competitive progression and operational reservations.

## Requirements

### Requirement: Canonical competitive vocabulary

The system MUST treat `competitive_context` as the canonical competitive projection and `reputation_summary` as the canonical social projection. Canonical competitive data SHALL include `league_id`, `season_id`, `category`, `tier`, `rating`, `ranking`, and `progression_points`. Legacy `stars` and `category_tier` MUST remain available as compatibility projections and MUST NOT replace canonical fields as source of truth.

#### Scenario: Canonical user payload with compatibility
- GIVEN a player with competitive and reputation data
- WHEN auth, profile, or leaderboard payloads are emitted
- THEN the response includes `competitive_context` and `reputation_summary`
- AND legacy `stars` and `category_tier` remain readable for compatibility

### Requirement: Slot and match lifecycle invariants

The system MUST use `Slot` as the operational source of truth and `Match` as the player-facing projection. Competitive completion SHALL only be valid when both match and slot are in a reservable/managed lifecycle that can transition to `completed`. A competitive completion MUST persist canonical result data through `canonical_completion` with a canonical `winning_side`.

#### Scenario: Managed reserved match completes competitively
- GIVEN a reserved match linked to a reserved non-manual slot
- WHEN a canonical completion is recorded with a valid `winning_side`
- THEN match and slot transition to `completed`
- AND the match exposes `canonical_completion`

#### Scenario: Invalid lifecycle is rejected
- GIVEN a match or slot still in `open`, `available`, or manual-blocked state
- WHEN competitive completion is attempted
- THEN the system rejects the transition

### Requirement: Progression and reputation separation

The system MUST keep competitive progression separate from peer reputation. Competitive results SHALL update progression metrics (`progression_points`, `rating`, tier, wins, losses, ranking inputs). Reputation submissions SHALL update only `reputation_summary` and MUST NOT mutate competitive progression.

#### Scenario: Competitive result updates progression only
- GIVEN a completed competitive match
- WHEN winner and loser updates are applied
- THEN progression and competitive rating change
- AND reputation averages remain unchanged unless a separate rating is submitted

### Requirement: Season reset semantics

The system MUST scope standings by season. When a player enters a new active season without an existing standing, progression, rating, wins, and losses SHALL reset for the new standing while preserving historical data and previous season reference. If the player already belongs to the same season, a missing standing SHOULD hydrate from the user snapshot instead of resetting.

#### Scenario: New season creates reset standing
- GIVEN an active season different from the player snapshot season
- WHEN the player receives a competitive standing in that season
- THEN the new standing starts from reset values
- AND season reset context records the previous season reference

### Requirement: Manual partner reservations stay outside competitive flow

Slots booked externally or marked with manual reservation data MUST be treated as operational-only. They SHALL appear as blocked/manual reservations, MUST NOT create competitive results or season standing writes, and MUST NOT be converted into competitive matches by this change.

#### Scenario: Manual reservation is excluded from standings
- GIVEN a completed slot marked as externally booked or manual
- WHEN backfill or completion processing runs
- THEN no competitive result or standing update is created

### Requirement: Canonical contract direction and constraints

The canonical result contract MUST use `winning_side` as the authoritative completion signal. Clients MAY send winner ids as a helper, but they MUST resolve to one canonical side when teams are known. Any remaining `competitive_completion` naming is compatibility debt and SHALL NOT supersede `canonical_completion`.

#### Scenario: Winner helper conflicts with canonical side
- GIVEN a completion request whose winner ids do not match the declared `winning_side`
- WHEN the backend validates the payload
- THEN the request is rejected as non-canonical
