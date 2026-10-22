# Portfolio review · 22 October 2026

Base revision: `ad34483a4b88fb05dbe7b24efd82c2d30fd1a5c5`.

## Changes prepared

- Repository overview and local PostgreSQL setup, replacing the outdated SQLite instructions.
- Local environment examples, demo seed opt-in, production rejection, caller-supplied demo credentials and optional background-worker disablement.
- Membership checks before joining chat rooms, sending messages or emitting typing events, with isolated regression tests.
- Panel lint fixes for explicit Buffer references; proposed CI for backend unit tests and panel tests, build and lint. No deploy job.

## Verification performed locally

- Backend: 20 isolated Node tests passed (chat authorization and demo seed policy).
- Panel: 66 Vitest tests passed across 7 files.
- Panel ESLint: passed.
- Panel Vite build: passed; route-level lazy loading reduced the main JavaScript chunk from about 565 kB to 391 kB minified, with no size warning.
- JavaScript syntax checks for edited backend entry points and `git diff --check`: passed.

These checks use no production database or credentials. They do not validate PostgreSQL integration, a full browser/device journey, payments, external providers or deployment. No mobile build or store release was performed. PostgreSQL binaries and Docker/Podman were unavailable, so no database-backed end-to-end claims are made. Four panel routing tests exercise lazy loading and authorization redirects with mocked sessions/venue data, not a live API.

## Remaining review gates

1. Review the historical tracked SQLite, SHM and WAL artifacts with the repository owner. Their contents were not inspected and the files were not removed. Any history cleanup is a separate decision.
2. Perform a complete local demo with disposable PostgreSQL and two test users; capture only synthetic data if adding screenshots.
3. Replace automatic schema alteration/backfill with a reviewed production migration process before production use.
4. Verify payment/provider behavior, CORS policy, device flows and release configuration independently. This is not a complete security audit or certification.
5. Check CI on the eventual PR commit. Local passing results alone do not prove remote CI ran.

Public history may still contain old demo credentials and operational configuration. Removing a value in a patch does not revoke a credential or rewrite history. No real account or credential was tested, rotated or changed during this review.
