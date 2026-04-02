# Proposal: Consolidate Competitive and Operational Domain

## Intent
Recover the authoritative proposal for an already implemented-in-part change so verify/archive can assess one stable source of truth. PADEX must use one competitive model and one operational slot lifecycle across backend, mobile, and partners-web; each season resets ranking, and manual partner reservations remain outside the competitive circuit for now.

## Scope
### In Scope
- Canonical backend vocabulary and contracts for `league`, `season`, `tier`, `rating`, `ranking`, `progression`, `slot_state`, and canonical match completion.
- Separation of competitive progression from social reputation, while preserving legacy `stars` and `category_tier` read compatibility.
- Cross-surface alignment: backend emits authoritative context, mobile submits canonical completion, partners-web keeps manual reservations operational-only.

### Out of Scope
- Tournament redesign, rewards, or new gamification.
- Converting manual partner bookings into competitive matches.

## Approach
Use `Slot` as the operational source of truth and `Match` as the player-facing projection. Current implementation reality: backend hydrates `competitive_context`/`reputation_summary`, records `canonical_completion`, seeds season standings through `services/competitive/seasons.js`, resets ranking when a player enters a new season, and skips competitive writes for manually booked partner slots. Mobile already sends canonical `winning_side` from `MatchDetailScreen`; partners-web and mobile both treat externally booked slots as blocked/manual reservations. Keep canonical fields authoritative and legacy fields as compatibility projections.

## Affected Areas
| Area | Impact | Description |
|---|---|---|
| `backend/src/middleware/auth.js` | Modified | Rehydrates authoritative competitive context from DB |
| `backend/src/routes/auth.js`, `profile.js`, `leaderboard.js`, `matches.js` | Modified | Emits canonical user/match contracts and completion data |
| `backend/src/services/competitive/*` | Modified/New | Season reset, standings, result processing, backfill, compatibility mapping |
| `mobile/src/screens/home/MatchDetailScreen.js`, `mobile/src/utils/domain.js` | Modified | Sends canonical completion and consumes canonical state fields |
| `partners-web/src/features/dashboard/Dashboard.jsx` | Modified | Labels manual reservations as blocked/operational-only |

## Risks
| Risk | Likelihood | Mitigation |
|---|---|---|
| Remaining contract drift (`competitive_completion` vs `canonical_completion`) | Low | Backend completion responses now emit `canonical_completion`; keep verify focused on downstream readers only |
| Partners-web validation incomplete | Med | Resolve lint/runtime gaps before archive |

## Rollback Plan
Keep legacy `stars`/`category_tier` projections and revert clients to legacy reads while leaving canonical fields non-authoritative.

## Dependencies
- Existing backend competitive foundation and cross-surface contract adoption.

## Success Criteria
- [ ] Proposal matches implemented backend/mobile/partners-web reality and agreed business rules.
- [ ] Season-scoped standings reset ranking on new season creation while preserving history.
- [ ] Manual partner reservations remain excluded from competitive standing/result writes.
- [ ] Verify/archive can use this artifact as the authoritative proposal source.
