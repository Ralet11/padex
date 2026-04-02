# Design: Consolidate Competitive and Operational Domain

## Technical Approach
Use backend canonical contracts as the single semantic boundary, with `Slot` as operational truth and `Match` as the player-facing projection. Existing code already centers this in `backend/src/routes/matches.js`, `services/competitive/*`, mobile `MatchDetailScreen`, and partners-web dashboard; this artifact stabilizes the intended design so verify/archive can judge one source of truth.

## Architecture Decisions

| Decision | Choice | Alternatives considered | Rationale |
|---|---|---|---|
| Operational truth | `Slot.state` owns availability/reservation/play/closure; `Match.state` mirrors player workflow only | Keep match-only lifecycle | Prevents drift with venues and preserves manual/external reservations as operational records |
| Competitive vs reputation | Match completion updates progression/rating/tier/standing; post-match ratings update only reputation summary | Continue mixing stars and ratings | Keeps competition deterministic and social feedback non-authoritative |
| Canonical contracts | Backend emits `competitive_context`, `reputation_summary`, `canonical_completion`; legacy `stars`/`category_tier` stay as projections | Force hard cut to new fields | Lets mobile/backend migrate safely while older reads remain functional |
| Season scope | Standings are per `(user_id, season_id)` and season entry can reset ranking/progression snapshot | Global lifetime ranking | Matches business rule that each season restarts ordered competition while preserving history |
| Manual partner reservations | `booked_externally` / partner manual bookings stay blocked operational slots and skip competitive season/result writes | Treat every reserved slot as competitive | Avoids polluting standings with offline reservations |

## Data Flow

`auth middleware` -> loads DB user -> builds `competitive_context`
`match create/join` -> validates category from authoritative tier -> reserves `slot` -> stamps `competitive_season_id` only for app-managed slots
`match complete` -> validates canonical result -> `ensureStandingForSeason` -> updates standing + user projections -> stores `CompetitiveResult`
`ratings` -> updates `ReputationProfile` / `reputation_*` only
`partners-web` -> renders external/manual slots as blocked, not competitive

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `backend/src/middleware/auth.js` | Modify | Hydrate authoritative competitive context from DB, not token-only claims |
| `backend/src/routes/auth.js` | Modify | Emit canonical user payloads with compatibility projections |
| `backend/src/routes/profile.js` | Modify | Return canonical user + reputation summary |
| `backend/src/routes/leaderboard.js` | Modify | Expose season-aware competitive fields while still sorting with legacy-compatible projections |
| `backend/src/routes/matches.js` | Modify | Enforce slot lifecycle, canonical completion, season assignment, and external booking exclusion |
| `backend/src/services/competitive/legacyMapping.js` | New/Modify | Build canonical context and legacy `stars`/`category_tier` projections |
| `backend/src/services/competitive/userContracts.js` | New/Modify | Centralize canonical response contracts |
| `backend/src/services/competitive/seasons.js` | New/Modify | Create season-scoped standings and reset-on-new-season behavior |
| `backend/src/services/competitive/progression.js` | Modify | Apply canonical completion, standing updates, and season context |
| `backend/src/services/competitive/matchLifecycle.js` | New/Modify | Guard allowed slot/match state transitions and external-slot behavior |
| `backend/src/services/competitive/backfill.js` | New/Modify | Backfill league/season/standing/reputation foundation from legacy data |
| `mobile/src/utils/domain.js` | Modify | Prefer canonical competitive and slot fields with legacy fallback |
| `mobile/src/screens/home/MatchDetailScreen.js` | Modify | Submit canonical `winning_side` contract and consume state enums |
| `partners-web/src/features/dashboard/Dashboard.jsx` | Modify | Treat manual reservations as blocked operational-only inventory |

## Interfaces / Contracts

```js
competitive_context: { league_id, season_id, category, tier, rating, ranking, progression_points }
reputation_summary: { avg_score, ratings_count }
canonical_completion: { schema_version: 1, winning_side, score, recorded_by, source, recorded_at }
```

Legacy compatibility:
- `stars` = projection of `progression_points`
- `category_tier` = projection of canonical `tier`

## Testing Strategy

| Layer | What to Test | Approach |
|-------|--------------|----------|
| Unit | Legacy mapping, lifecycle guards, season reset semantics | Service-level tests around `legacyMapping`, `matchLifecycle`, `seasons` |
| Integration | Match create/join/complete, external slot exclusion, canonical payload validation | Route tests covering `matches`, `leaderboard`, `auth/profile` |
| Cross-surface | Mobile completion payload and partner blocked-slot rendering | Existing JS tests/manual verification against API contracts |

## Migration / Rollout

Migration is required but backward compatible. The phase-1 migration adds `leagues`, `seasons`, `competitive_standings`, `competitive_results`, `reputation_*`, slot/match state fields, and user competitive columns. `backfill.js` seeds canonical league/season records, copies legacy user progression into standings, and materializes reputation summaries. Legacy `stars` and `category_tier` must remain readable until all consumers rely on `competitive_context`; they are compatibility projections, not the source of truth.

## Open Questions

- [ ] `leaderboard.js` still queries `users` directly instead of `competitive_standings`; verify/archive should decide whether season-specific reads must move fully to standings before archive.
- [x] Response naming now uses `canonical_completion` consistently for completion and match-detail payloads.
