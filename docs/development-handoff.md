# Development handoff — slice-0.1

Original planning baseline: 24 October 2026. Implementation now exists. See docs/implementation-status.md and README.md for current verified behaviour; the not-started statements below describe the original handoff and must not be treated as current status.

## Start here
Implement this baseline before adding content. Read this file, docs/gameplay-contracts.md, docs/technology-and-delivery.md and docs/acceptance.md. Use data/vertical-slice.en.json as the slice manifest, data/balance.en.json for pacing and data/toolchain.en.json for the selected stack.

Authority order:
1. The user's latest explicit direction.
2. This handoff and docs/gameplay-contracts.md for resolved behaviour.
3. Machine-readable data for registered values and content availability.
4. docs/game-design.md, controls-and-art.md and cocktail-preparation.md for design context.
5. requirements.md for source coverage; research-review.md for rationale, not a task queue.

A handoff clarification supersedes an earlier broad proposal. Every future design change must update its data and dependent wording together.

## Frozen first playable
- One compact voxel neighbourhood bar, English UI and dialogue.
- Three source recipes: Old Fashioned, Margarita, Manhattan.
- One bartender; two tables and two counter seats; workload caps independent of furniture.
- Marked measuring, optional Free Pour/toggle, proper techniques, glass/ice/garnish and stock consumption.
- A small menu-reading/service loop, two-item tray, contextual auto-walk and a two-task maximum.
- Quick POS, counter wipe, clean/dirty glasses, short closing, costed replenishment.
- Eighteen specifically enabled dialogue encounters, subject to real context and story eligibility. Twenty-four authored encounters total; six are deliberately deferred.
- extra_cherry is the only first-slice recipe modifier. Less-sweet variants, combined modifiers, three-way split POS, and their encounters unlock in the systems stage.
- Customer story memory including Mara's cherry callback; save/resume permits a second shift.
- Practice Bench and the shared mouse/touch/keyboard action model.
- Local save; explicit pause/interruption recovery; static GitHub Pages build target.

After this slice: detailed POS, two warmed snacks, barback, advanced modifiers and full customization. After hours: optional House Dice and scripted stool comedy. The screenshot ledger retains all other drink names; uncertain names do not block the three-recipe slice.

## Firm product decisions
- Voxel art with an elevated fixed overview; close-up at the mixing station.
- Selected stack: React 19, React Three Fiber 9, Three.js, TypeScript, Next.js with Turbopack, Tailwind v4, selective shadcn/ui and a small Zustand UI bridge. Bun packages; Vitest, Playwright and GitHub Actions/Pages. Details and sources are in docs/technology-and-delivery.md.
- Real ingredients/amounts and customer-tailored sweet lies are both core.
- No player-facing provenance information or truth/lie choice badges.
- No automatic whole-drink crafting.
- No timed dialogue or mandatory device-motion gesture.
- No online accounts, cloud sync, real payments or multiplayer in the slice.
- Working title is Dive Bar; it can change without affecting IDs or save schema.
- Standard measuring assistance and service difficulty are independent.
- A physical-device gate is required for a mobile-support claim; it is validation, not a request to stop and ask permission.

## Implementation order and acceptance
| Stage | Build | Exit condition |
| --- | --- | --- |
| M0 — foundation | React/TypeScript + Next.js/Turbopack static export, R3F Canvas, Tailwind v4, minimal themed shadcn UI, content loader and first quality checks | Compatible versions locked; content/type/build checks work; unsupported graphics gives a readable message; no server requirement |
| M1 — interaction proof | One workstation, Margarita, measuring/transfers, technique and stock | Correct single recipe can be made and served with mouse and real phone touch; interruption cannot continue a pour |
| M2 — visual proof | Finished corner, bartender, two coherent NPC appearances, essential foley | Readable faces, bottles, targets and amounts at actual phone size; optional effects can be disabled |
| M3 — complete shift | Three recipes, visits, tickets, menus, queue, quick POS, cleaning and close | One shift completes without deadlock, duplicate serving/payment or loss of an unfinished mixture |
| M4 — social and persistence | Enabled encounters, exact authored outcomes, story memory, save/import/export | Truthful supermarket answer cancels; plausible lie succeeds; callback requires the saved story; reload preserves committed state |
| M5 — tune and deliver | Comfort options, measured pacing, performance, production build and Pages | Acceptance scenarios pass locally; real-device results recorded; live URL independently checked after deployment |

M3 is a complete service loop, not a content-complete game. M5 releases the slice; later systems are a separate milestone. Do not add decorative content to compensate for a failed M1 control proof.

## Suggested source boundaries
- src/game: domain state, semantic actions, visit/order transitions, two clocks, workload director.
- src/mixing: vessel ledger, measurement, technique constraints, recipe resolution and quality.
- src/social: encounter predicates, nodes, authored effects, rapport and story memory.
- src/economy: inventory, tabs, integer money, restock, recovery supplies.
- src/view: React Three Fiber scene components, Three.js models, camera, refs/frame animation and effects.
- src/ui: React English HUD, workstation controls, themed focus panels and selected Zustand subscriptions.
- src/storage: versioned snapshots, migrations and import/export.
- public/assets: runtime GLB, textures and audio; source art in assets-source.
These are boundaries, not a requirement for a custom framework or ECS. No source directories or app dependencies have been created yet.

React renders must not advance simulation, mutate inventory or commit payments. High-frequency scene updates use refs/frame updates, not broad React state subscriptions. CI/CD and dependency update choices are specified in docs/technology-and-delivery.md; actual pipelines start when the corresponding code/scripts exist.

## Content policy
Use canonical customerId, recipe IDs, order-line IDs and action IDs; display names are labels. Load the two dialogue banks, then enable IDs from the manifest tier. Do not infer eligibility from the English trigger sentence.

A registered handler must exist before its terminal action, orderChange, story prerequisite or world change is enabled. No silent fallback from an unknown drink or modifier to another recipe.

The manifest's encounterBindings gives the event and named predicates for all 18 slice encounters. Implement a small named predicate registry; do not create a general expression engine. During M0–M3, social execution can remain capability-disabled; M4 must register and validate all required predicates before enabling the full bank.

Keep authoring-only truths and response intents out of the UI. Because this is a static client, JSON files are not cryptographic secrets; do not build a server merely to hide story metadata.

## Asset checklist for the slice
One modular room, one station set, nine ingredient representations, four garnish representations, measuring/mixing/serving tools, two serving glass shapes, ice, tray, cloth, sink, trash, tables/stools, terminal, menu and tickets. A shared character rig plus distinct outfits/heads can support the named roster.

Required first animations: idle, walk, carry, pour/transfer, technique loop, serve, approve, skeptical and disappointed. A sprite/face atlas can express dialogue; no full voiceover or lip-sync is required. Record source/licence for any external asset used later.

## Open items that do not block development
- Uncertain cocktail names/variants in the screenshot are deferred until identified and sourced.
- Final balance, prices, economy, animation durations, camera spacing and performance need prototype measurements.
- Full art production and final voice editing follow the visual/control proofs.
- The exact real phones/browsers used for QA must be recorded when available.
- A Git repository and deployment repository name have not been selected. Local work can start; public deployment requires the actual repository base.

No unvalidated claim of perfect balance, production-ready graphics, supported phones or completed deployment should appear in a progress report.
