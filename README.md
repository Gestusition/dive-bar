# Dive Bar

A small voxel neighbourhood bar. Real measures, familiar faces, and the occasional little white lie.

## Play locally

Requires Node 24 and Bun 1.4.2.

```sh
bun install --frozen-lockfile
bun run dev
```

Build and preview the exact static application:

```sh
bun run build
bun run preview
```

## What is implemented

- React 19 + React Three Fiber 9 / Three.js voxel room and characters.
- Desktop and portrait/touch UI, with keyboard-accessible controls and reduced motion.
- Fourteen classic, regional and explicitly labelled house recipes; select up to six for a night.
- Measured or free pouring, native dash/piece/spoon units, mixing tools, ice, glassware, garnish and a recipe book.
- Recipe quantity, proportion, yield and technique evaluation; real stock consumption and waste.
- Guest arrival, seating, menu reading, orders, preparation, drinking, tabs, payment and last call.
- Warm pretzels and cheese toasties, one warming slot, snack stock and charges.
- Split-payment POS, integer money, idempotent settlement and one final tip.
- Authored English conversations, plausible sweet lies, saved rapport and story callbacks.
- Cleaning, washing, trash, editable restocking, ice refills and a closing recap.
- Decor themes that change the room, plants/neon and a working barback upgrade.
- Optional after-hours dice and a small scripted stool wobble.
- Separate unlimited practice inventory; IndexedDB saves and validated JSON import/export.
- Locally bundled fonts and a static GitHub Pages-compatible build.

The conversation banks contain 24 encounters / 96 responses. The runtime selects context-fitting social encounters; service-draft encounters are retained as source content rather than indiscriminately shown in the wrong situation. There is no ingredient-provenance UI or truth/lie answer badge.

## How to play

1. Open the bar, offer the first guest a seat, and let them read.
2. Take their order. Chat before preparation if they have something to say.
3. At the counter choose the vessel, ingredients and measures. Transfer each measure.
4. Follow the recipe's technique, chill/choose the serving glass, and garnish.
5. Serve, let the guest enjoy it, then settle the tab.
6. Call last orders when ready. Clean, empty trash, check stock and close.
7. Spend between nights or play a friendly round of dice.

Escape closes a panel or pauses. Reading panels pause service. Hidden tabs pause and require Resume; an interrupted pour never resumes by itself.

## Checks

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

Vitest is the selected unit runner; use bun run test:unit rather than bun test. Playwright tests the production build in Chromium, Firefox, touch Chromium and narrow touch WebKit contexts. Emulation is not a physical-phone performance certification.

## Delivery

.github/workflows/ci.yml checks PRs and main, then deploys the same tested artifact on main. Dependabot maintains Bun and Actions dependencies without auto-merge. The repository must have Pages enabled. A preview publication may use a separate gh-pages branch while the implementation PR awaits review; main CI switches Pages to the Actions source after merge.

No merge is implied by passing CI or creating a PR.

## Source map

- src/game/engine.ts — deterministic service, stock, money, dialogue effects and shift transitions.
- src/game/quality.ts — recipe and technique scoring.
- src/game/store.ts — React bridge, clock ownership, action queue and sound.
- src/game/storage.ts — IndexedDB and save validation.
- src/view/BarScene.tsx — merged voxel geometry, scene, actors and cameras.
- src/ui/Station.tsx — hands-on cocktail workstation.
- src/ui/Management.tsx — nightly menu, editable stock and split POS.
- src/ui/App.tsx — application shell, guest and focus flows.
- data/cocktails.en.json — original IBA recipe seeds.
- data/catalogue.en.json — researched expansion and declared house variations.
- docs/recipe-research.md — uncertain-name interpretations and recipe sources.
- docs/implementation-status.md — verified behaviour and remaining validation limits.
- docs/development-handoff.md — original implementation plan; current runtime status supersedes its original not-started wording.

The supplied artwork in public/assets and art-src was preserved. Voxel geometry is authored in code. Fredoka and Nunito are self-hosted via Fontsource (SIL Open Font License; license notices are shipped in public/licenses).



