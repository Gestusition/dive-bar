# Delivery verification: 0.0.2

Updated 29 October 2026. Current source branch: `fix/playtest-round-2`. The release tag identifies the published source; Pages continues to follow `main`. A feature-branch release is not evidence of a Pages deployment.

## Current checks

- Content validation: 24 authored encounters, 14 sourced or declared house recipes, and 14 story variants.
- Formatting, ESLint and TypeScript pass, including the browser tests and fixture generator in typechecking.
- Vitest: 81 tests across engine, quality, navigation, storage/sealing and the UI store. All fourteen recipes are prepared through reducer actions as well as checked against their specifications.
- Production build: Next.js 16 static export to `out/`, with no application server.
- Playwright: 18 scenarios on four profiles (72 scheduled cases). Desktop-only portrait-rotation cases are deliberately skipped on Chromium and Firefox; phone profiles execute them.
- The six README images are real production-build captures: desktop at 1440 × 1000 and Galaxy S8 landscape emulation at 740 × 360. The Manhattan images use a normal signed fixture backup imported through Settings.

The complete local matrix passed: **70 passed, 2 intentionally skipped, 3.6 minutes** with two workers. The unit suite passed all 81 tests (373 ms in the final local run, compared with 1.73 seconds and 10 failures in the original 36-test suite). These are observed local runs, not a controlled performance benchmark. Remote CI results belong to the corresponding Actions run and release notes; workflow configuration alone is not a passing-run claim.

## Coverage and defect findings

| Area | Evidence |
| --- | --- |
| Ingredient tolerance | Inclusive ±18% ml boundaries, just-outside rejection, minimum 1 ml allowance, exact authored dash ranges, unchanged tighter perfect-score margin, real-browser blocked overpour |
| Recipe preparation | All 14 recipes through actual measuring, transfer, dissolution, mixing and garnish actions; current pointer/keyboard hold controls in browsers |
| Money and stock | Replay-safe solo/party settlement, snack bills after drink cancellation, no surplus loss on restock, fractional refill pricing, no fractional snacks |
| Capacity and quality | Consistent dash-to-volume conversion, no remake-level tips from social/decor bonuses, correct optional-garnish and overmix completion |
| Save integrity | Standard SHA-256/HMAC comparison, binary round trip, fresh nonces, signature/context tampering, active-night backup round trip, invalid shapes, file and decompression bounds, corrupt-device recovery |
| Service and input | Every navigation sample retains collision/speed checks; queued errands wait for arrival; reading/hidden tabs pause; pointer free pour and held mixing stop on focus loss |
| Browser journeys | Renderer/menu/layout, rotation, seating, conversation success/cancellation, full Manhattan/payment/reload, practice, native dashes, pause, closing/next night, drawers, Escape, title return, preparation errors and backups |

## Runtime and test speed

Production clock intervals, guest patience, rendering quality, animation and game speed were not changed to shorten tests. The browser service helper advances at most 250 ms per jump, retaining every service tick while coalescing intermediate frame callbacks. Held motions still run every 100 ms input timer. Navigation checks inspect the same sampled points and geometry but avoid allocating a matcher for every sample/voxel.

CI builds once and transfers the identical artifact to four separate browser jobs. Each job installs only its browser and keeps one worker for software WebGL stability. Pages artifact publication requires all four jobs to pass. Local iteration uses two workers.

Physical phones, real iOS/Android audio and input policies, heat/battery, extended human playthroughs and long-term balance remain unverified. ±18% is a design choice with automated boundary coverage, not a measured optimum from player studies.

## Historical records (superseded)

The following entries describe earlier deliveries, not the current build system, profile matrix or verification counts.

# Delivery verification: 25 October 2026

Current consolidation: dependency PRs #2–#6 are integrated into main with Vite 8 / React plugin 6 / Vitest 5 and TypeScript 7 plus the TypeScript 6 API alias for lint. Bartender walking uses the right-hand opening and errands wait for arrival. Local validation passes 30 unit tests and 9 desktop browser scenarios. The complete 36-scenario matrix and main Pages publication are verified by the current Actions run; consult that run for its result. The temporary preview branch is retired once main publication succeeds.

## Earlier preview verification record

- Source branch: playable-bar. Pull request: https://github.com/Gestusition/dive-bar/pull/1 (draft; main was not merged).
- Public game: https://gestusition.github.io/dive-bar/ . Preview artifacts are published on gh-pages. build-info.json identifies the source commit.
- Local checks: 24 dialogue encounters and 14 recipes validate; formatting, ESLint and TypeScript pass; 26 unit tests pass; production build succeeds.
- Local browser matrix: all 32 tests pass across Chromium, Firefox, Pixel 7 Chromium emulation and narrow touch WebKit.
- Live Pages: all 8 desktop browser scenarios pass, including a manually measured Manhattan, the cherry story, one settlement and reload persistence, cancellation, practice, closing and focus loss. Live screenshots also checked the phone layout and workstation: no page errors or horizontal overflow.
- The static Pages build and deployment completed successfully. Source CI results are available in the PR checks; a local pass is not a substitute for a remote pass.
- No physical phone performance, heat/battery or real iOS Safari claim is made. See implementation-status.md for scope and remaining device/playtesting limits.

To repeat browser scenarios against a deployed repository path, set PLAYWRIGHT_BASE_URL to its full trailing-slash URL before running bun run test:e2e. Test navigation is relative to that path.

