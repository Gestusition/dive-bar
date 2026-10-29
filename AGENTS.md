# AGENTS.md: Dive Bar

## Communication and scope

- Write repository content, comments, commits and pull requests in English; user conversations may be in Turkish.
- Check the branch and working tree before editing; preserve existing changes. Use the branch the user requested.
- Keep changes focused. Do not merge, deploy or publish a release unless the user requested it.
- Never change game speed, timers, patience, animation, rendering quality or production behavior to make tests faster. Optimize test setup, clock usage and CI scheduling instead.
- Fix behavior with a regression test. Distinguish obsolete test assumptions from actual defects; do not remove coverage or weaken assertions to get green checks.

## Project map

- `app/`: Next.js entry points and global styling; this is a static export, without an application server.
- `src/game/engine.ts`: deterministic simulation, inventory, parties, payments, dialogue and shift transitions.
- `src/game/quality.ts`: taste scoring and ingredient-level serving bounds.
- `src/game/store.ts`: Zustand bridge, service queue, 250 ms clock and persistence.
- `src/game/storage.ts`, `seal.ts`: validated IndexedDB saves and signed `.divebar` backups.
- `src/game/navigation.ts`, `room-layout.ts`: routes and shared scene geometry.
- `src/ui/`: player controls and accessible dialogs; `src/view/BarScene.tsx`: real WebGL scene.
- `data/`: researched recipes and authored dialogue; `docs/recipe-research.md`: sources and house variations.
- `e2e/`: production-browser journeys. `scripts/test-fixture.ts` generates a normal signed backup for deterministic story setup through the import UI.
- `.github/workflows/ci.yml`: one quality/build job, four independent browser jobs, then gated Pages publication.

## Development

Use Node 24 and Bun 1.4.2. Run `bun install --frozen-lockfile`, then `bun run dev`.
`bun run build` writes `out/`; `bun run preview` serves it on port 4173.
GitHub Pages builds with `BASE_PATH=/dive-bar` and `NEXT_PUBLIC_BASE_PATH=/dive-bar`.
Keep the base path consistent for build, preview and browser tests. Next.js regenerates `next-env.d.ts` for the last development/build mode; do not hand-edit it.

## Gameplay contracts

- Money uses integer minor units. Stock and cash cannot become negative. Settlement is idempotent and covers every unpaid party member.
- Preserve native ml, dash, piece and spoon units. Service accepts ±18% for ml with a 1 ml minimum allowance; authored discrete ranges stay exact. Perfect taste scoring keeps its tighter margin.
- Practice never consumes paid stock. Discarded ingredients and removed garnishes are not refunded.
- Reading dialogs, pause and hidden tabs stop service. Interrupted held inputs stop until deliberately pressed again.
- Saved data must pass strict validation after signature verification. A shipped client key is not protection against a determined reverse engineer. Never run imported data as code.
- Use real in-game captures for documentation. Browser emulation does not establish physical phone performance, real iOS input, audio policy or a complete human playthrough.

## Verification

For behavior, test, CI or release work, run the relevant checks and report actual results:

```sh
bun run validate:content
bun run format:check
bun run lint
bun run typecheck
bun run test:unit
bun run build
bunx playwright install chromium firefox webkit
bun run test:e2e
```

Use Vitest via `bun run test:unit`, not `bun test`. For iteration, select a Playwright project with `--project=desktop`; run all four before release. Browser tests must use the production build and real renderer. Do not replace it with a mock canvas. Clock jumps must preserve every simulation tick; held input tests must preserve every input timer. CI keeps one worker per browser runner to avoid software WebGL contention. Keep traces and screenshots for failures.

## Pull requests and releases

- Use concise Conventional Commit subjects and `.github/PULL_REQUEST_TEMPLATE.md`.
- Describe the player-visible problem and resulting behavior; list actual checks, remaining limitations and screenshots for visible changes.
- Update README and implementation status when behavior or commands change. Keep `CHANGELOG.md` factual and grouped by Added, Changed and Fixed.
- Update the package version and regenerate the Bun lockfile; commit any resulting lockfile changes. Tag the exact reviewed commit; do not label untested working files as a released build.
- Publish only after ingredient tolerance work and all required checks pass. Pages deploys from `main`; a release from a feature branch does not deploy that branch to Pages.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
