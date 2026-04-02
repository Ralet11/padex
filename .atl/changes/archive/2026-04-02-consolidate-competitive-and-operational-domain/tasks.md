# Tasks: Consolidate Competitive and Operational Domain

## Phase 1: Canonical Foundation

- [x] 1.1 Add canonical persistence in `backend/src/migrations/20260402060000-phase1-competitive-foundation.js` plus `backend/src/models/{League,Season,CompetitiveStanding,CompetitiveResult,ReputationProfile,ReputationRating}.js`.
- [x] 1.2 Add compatibility mapping in `backend/src/services/competitive/{legacyMapping.js,userContracts.js}` and hydrate `backend/src/middleware/auth.js` with DB-backed `competitive_context`.
- [x] 1.3 Backfill existing users, slots, matches, and ratings via `backend/src/services/competitive/backfill.js`, skipping manual partner reservations.

## Phase 2: Operational Lifecycle and Completion Contract

- [x] 2.1 Normalize slot/match states in `backend/src/constants/{slotStates.js,matchStates.js}`, `backend/src/models/{Slot.js,Match.js,MatchPlayer.js}`, and guard transitions in `backend/src/services/competitive/matchLifecycle.js`.
- [x] 2.2 Update `backend/src/routes/matches.js` to assign competitive seasons only to managed slots, enforce category checks from authoritative context, and persist canonical completion results.
- [x] 2.3 Update `mobile/src/screens/home/MatchDetailScreen.js` and `mobile/src/utils/domain.js` to send `winning_side`/`result` payloads and consume canonical slot/match state plus `canonical_completion`.
- [x] 2.4 Keep manual partner reservations operational-only in `partners-web/src/features/dashboard/Dashboard.jsx` and backend backfill/lifecycle paths.

## Phase 3: Competitive and Reputation Computation

- [x] 3.1 Implement season-aware standing creation/reset in `backend/src/services/competitive/seasons.js` and competitive progression in `backend/src/services/competitive/progression.js`.
- [x] 3.2 Split social reputation writes from competitive updates in `backend/src/services/reputation/service.js` and `backend/src/routes/ratings.js`.
- [x] 3.3 Recompute and expose authoritative season rankings from `competitive_standings` in `backend/src/routes/leaderboard.js` and related reads instead of relying mainly on user snapshot fields.

## Phase 4: Contract Cleanup and Verification

- [x] 4.1 Preserve regression coverage in `backend/test_competitive_foundation.js` for canonical completion, season resets, auth hydration, reputation separation, and manual-reservation skips.
- [x] 4.2 Standardize response naming between `canonical_completion` and `competitive_completion` in `backend/src/routes/matches.js` and all clients before archive.
- [x] 4.3 Finish normalized competitive/reputation reads in `backend/src/routes/profile.js`, `mobile/src/screens/{leaderboard/LeaderboardScreen.js,profile/ProfileScreen.js,social/PlayerProfileScreen.js}`, and `partners-web/src/features/home/HomeLanding.jsx` so clients stop depending on legacy-only fields.
