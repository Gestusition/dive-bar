# Delivery verification — 25 October 2026

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

