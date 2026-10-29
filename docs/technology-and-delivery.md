# Technology and delivery: 24 October 2026

> Historical planning baseline. A playable runtime now exists; see [implementation-status.md](implementation-status.md) for actual scope and validation limits.


Status: selected planning baseline, not installed or executed. The user accepted React + React Three Fiber. Stack choices below refine the existing static-game architecture.

## Stack decision
| Role | Selected | Scope |
| --- | --- | --- |
| UI | React 19 + TypeScript strict | HUD, menus, POS, dialogue, settings |
| Scene | React Three Fiber 9 + Three.js | Room, characters, cameras, tools, animation |
| Scene helpers | Selective Drei helpers | Model loading/animations where useful; avoid unnecessary feature imports |
| Build | Next.js App Router + Turbopack | Client-only game UI and static production output |
| Styles | Tailwind CSS v4 via @tailwindcss/postcss | Responsive layouts and shared theme tokens |
| UI foundations | Selective shadcn/ui | Dialog, Tabs, Slider, Switch, Button as actually needed |
| UI state bridge | Zustand | Small selected UI snapshots and settings; not a per-frame React update bus |
| Simulation | Independent TypeScript modules | Ingredients, quality, orders, money, customer lifecycle, clocks |
| Packages | Bun, text bun.lock | Same frozen dependency graph locally and in CI |
| Tool runtime | Node 24 LTS | Explicitly supported execution environment for tooling |
| Quality | ESLint, Prettier, explicit TypeScript check | Separate checks; a successful Vite build alone does not prove types |
| Domain tests | Vitest | Important invariants and state transitions |
| Browser E2E | Playwright | Real UI actions against the built application |
| CI and hosting | GitHub Actions + GitHub Pages | Validate changes and deploy a tested static artifact |
| Updates | Dependabot | Bun and Actions updates, without auto-merge |

Exact compatible patch versions must be resolved and locked during M0. Do not install changing latest versions on every CI run. React 19 and Fiber 9 are a documented major-version pair; avoid alpha Fiber 10 for this baseline.

Next.js handles development and static production export, with Turbopack as its bundler. The game is rendered client-side so its browser storage and WebGL scene do not require a server runtime. GitHub Pages builds set the `/dive-bar` base path; local builds use the root path.

## React and performance boundary
Mount the R3F Canvas once. Scene composition and low-frequency changes can be declarative. Use useFrame/refs for scene presentation and delta-based animation. Keep authoritative domain actions outside component rendering and publish small UI snapshots.

Do not send movement, pour fill or every timer tick through broad React setState subscriptions. Reuse geometry/materials and use instancing for repeated props. One simulation update owner prevents ticking once per customer component.

A UI panel dispatches semantic actions; a React render must never charge a tab, consume stock, advance random state or apply a dialogue effect. Effects/subscriptions must clean up, including development StrictMode remounts. These rules preserve duplicate-action guarantees.

## Styling
Use shadcn components only where they reduce focus/keyboard/touch work. Give them the game's warm wood/cream/cherry/teal theme, large touch choices and opaque readable surfaces. The HUD, ticket rail, recipe cards and dialogue presentation remain game-specific components.

Tailwind affects DOM UI, not the 3D scene material appearance. Define palette tokens once and bridge relevant colours to scene materials. Runtime-generated class names need a discoverable/static mapping; do not expect arbitrary JSON strings to become generated CSS automatically.

Choose one installed shadcn primitive foundation/preset and retain it consistently. Add only used components. Accessibility still requires checking focus, semantic labels, contrast and game-input blocking around the canvas.

Tailwind v4's documented core browser floor is Chromium 111+, Safari 16.4+, Firefox 128+. Final support is the intersection with WebGL2, Next.js output, libraries and real-device checks. Avoid optional CSS features with a newer floor unless fallback is defined.

## Test allocation
| Layer | What earns a test | Examples |
| --- | --- | --- |
| Content validation | Cross-file references and enabled capability checks | Canonical customers, recipe units, story prerequisites, declared slice tier |
| Domain unit | A failure can corrupt the game state or undermine core rules | Transfer conservation, overfill, wrong-base/yield scoring, order revisions, work reservations, duplicate payment, tip clamping |
| State integration | Several domain modules interact | Cancellation + wasted stock + tab, last-call grace, save migration/recovery |
| React integration | A complex interactive panel needs focused verification | Focus return, choice committed once, keyboard POS splitting |
| E2E | A player-visible journey must work through actual controls | Make/serve Margarita, cherry choice, settle once, save/resume, touch interruption |

Avoid implementation-mirroring tests, every-class snapshots, arbitrary 100% coverage targets or duplicate browser tests for pure math. Prioritize the 27 observable acceptance scenarios.

Vitest is the selected unit runner. With Bun packages, use the named script via bun run test:unit. bun test invokes Bun's own runner and is not interchangeable with the chosen Vitest configuration.

## Browser plan
PR critical suite:
1. Desktop Chromium: start, prepare a real recipe using the UI, serve, settle and verify the recap.
2. Chromium mobile/touch: actual pointer workflow, cancel/release, narrow viewport and rotation/reflow.
3. WebKit mobile UI: focus panels, dialogue, persistence and a supported graphics smoke.

Expanded scheduled/manual/release suite: Chromium, Firefox and WebKit; fixed content seed, stable fixture saves, deterministic clock control and separate test contexts. These are planned runs, not an automation already created.

Use labelled DOM controls and stable test IDs. Observe the real domain state through a narrow read-only development/test adapter where needed; do not bypass crafting by directly marking orders complete.

A WebGL smoke uses the actual canvas/renderer. Mocked rendering or bypassed graphics initialization does not count as full-game E2E. CI may use software rendering: it can validate functionality, not device GPU performance. Missing WebGL2 in the runner is an explicit graphics-test failure/environment issue, not a silent passing skip.

On failure retain the Playwright report, screenshot and trace; keep retries limited and investigate flaky checks. Freeze animations only for selected HUD/panel visual comparisons, not to conceal broken gameplay.

Browser device emulation is useful but does not reproduce a physical iPhone/Android GPU, thermal behaviour, OS interruptions or every Safari quirk. Keep the real-device release gate.

## CI and CD contract
Planned PR checks:
- Frozen install, content validation, formatting, lint and typecheck.
- Meaningful domain tests.
- Production build.
- Critical E2E against that built artifact under the intended base path.
- Upload build/report artifacts; no deployment from a pull request.

Planned main/manual deployment:
- Run/reuse required checks for the exact revision.
- Deploy the same tested dist artifact through the official Pages artifact/deploy flow.
- Correct `/dive-bar` base path for the actual repository, relative GLB/audio paths and no server-only routes.
- Verify the live URL and key assets after deployment. A successful build is not evidence of a live working game.
- Keep CI read-only by default; grant Pages/id-token permissions only to the deploy job. Do not run untrusted PR code with deployment credentials.

Once an approved merge or authorized push reaches main, a green deployment pipeline can publish that revision automatically. Dependabot/CI never authorizes merging a PR. No auto-merge.

Required checks should be enabled when their implementation and runner are real, starting in M0 and growing with the milestones. Do not commit workflows that invoke nonexistent package scripts merely to make the plan look complete.

## Dependency maintenance
- Use Bun's text bun.lock, not the old binary bun.lockb, because the documented Dependabot support is for bun.lock.
- Configure bun and github-actions ecosystems when the manifest and workflows exist.
- Weekly version PRs, bounded count, grouped compatible patch/minor changes.
- Keep React, ReactDOM, their types, Fiber, Drei and Three peer compatibility together.
- Major updates need a migration review, new lockfile and the relevant checks.
- shadcn copies of component source need their own update review; a package update bot alone cannot guarantee that copied UI source is current.
- Keep supported security alerts/updates enabled, with prompt review; do not equate a weekly version schedule with guaranteed security-update timing.
- Pin CI tool versions and Actions revisions at setup; let updates arrive as reviewable PRs.
- Never auto-merge dependency updates.

## Setup timing and current truth
No packages, package manifest, lockfile, workflow, test suite or repository settings have been installed/created. Existing planning JSON was structurally validated only. M0 should create the project and the first working checks; later milestone scripts should be enabled when their feature exists.

## Official sources
- [Fiber major-version pairing](https://r3f.docs.pmnd.rs/getting-started/introduction)
- [Fiber performance rules](https://r3f.docs.pmnd.rs/advanced/pitfalls)
- [Next.js](https://nextjs.org/docs)
- [Tailwind with PostCSS](https://tailwindcss.com/docs/installation/using-postcss)
- [Tailwind compatibility](https://tailwindcss.com/docs/compatibility)
- [shadcn with Next.js](https://ui.shadcn.com/docs/installation/next)
- [Turbopack](https://nextjs.org/docs/app/api-reference/turbopack)
- [Zustand](https://github.com/pmndrs/zustand)
- [Vitest](https://vitest.dev/guide/)
- [Playwright CI](https://playwright.dev/docs/ci-intro)
- [Playwright emulation](https://playwright.dev/docs/emulation)
- [Dependabot options](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference)
- [Dependabot Bun lockfile support](https://docs.github.com/en/code-security/reference/supply-chain-security/supported-ecosystems-and-repositories)
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)
- [Node releases](https://nodejs.org/en/about/previous-releases)

