# Dive Bar — revised game design

Revision: 24 October 2026. Status: planning and authored data; no playable implementation.

Read docs/research-review.md for evidence, docs/requirements.md for source coverage, docs/controls-and-art.md for controls and visuals, docs/system-design.md for diagrams and data contracts, and docs/cocktail-preparation.md for recipe mechanics. Initial tuning lives in data/balance.en.json.

Development entry point: docs/development-handoff.md. Its frozen slice scope and docs/gameplay-contracts.md resolve edge cases; data/vertical-slice.en.json registers prices, stock, customer IDs, tools and content tiers. These take precedence over earlier broad proposals below.

## Game promise
Run a tiny, warm, slightly scruffy neighbourhood dive bar. Make real cocktails by selecting and measuring ingredients. Read the regulars, tell them the little story they want to hear, and use a good night's earnings to make the bar yours.

English player-facing text. Voxel characters and environments. Elevated fixed overview plus a close-up mixing station. Phone and desktop browser support, delivered as static GitHub Pages assets.

Technology baseline: React + TypeScript, React Three Fiber/Three.js, Vite, Tailwind CSS v4 and selective themed shadcn/ui. Zustand bridges selected UI state; game rules remain framework-independent. Quality and delivery use Vitest, Playwright, GitHub Actions, Dependabot and Pages as specified in docs/technology-and-delivery.md.

## Pillars
1. Tactile craft: real measures, ratios, mixing technique, ice, and garnish, with satisfying sound and animation.
2. People worth remembering: recurring faces, usual orders, sweet lies, and callbacks.
3. A shift with rhythm: gentle start, steady service, a brief busy spell, breathing room, and optional after-hours play.

## Shift and capacity
Opening: choose a small menu, check station supplies, and open. Service: seat, give menu, wait for readiness, take orders, prepare, serve, talk when invited, and settle. Closing: clear/clean, trash, stock/ice check, then upgrades or a short hangout.

Target roughly 8–12 real minutes for a familiar House Shift with some reading. The initial service clock is 420 seconds; reading and explicit pauses add real time. These are hypotheses.

Start with one bartender, two small tables, and two counter seats. House Shift caps admitted groups at two and guests per group at two, independently of available seats. One outside waiting group. Three unfulfilled/reserved first-drink lines maximum; show the ticket rail with room for four in Rush. Admission reserves a slot for each guest still choosing a first drink, so later order placement cannot overflow the work budget. Check seats, work queue and stock.

Menu reading creates breathing room. A Ready icon replaces repeated checking. Telegraph a short optional rush. Stop admissions before the wind-down.

## Interaction
Tap/click a guest or station: auto-walk to its interaction point, then perform one contextual action. A second ordinary target replaces the pending target. An explicit Queue control permits one extra task; show and allow cancellation of both. A tray carries two finished items.

One overview, one workstation, and one shared focus layer for Dialogue, Recipe Book, Detailed POS, or Pause. Never stack focus panels. Pin the selected ticket at the workstation. Preserve unfinished mixtures when returning to the floor.

Standard measuring: select ingredient, select a marked amount, watch a brief measured pour, transfer to the correct vessel. Offer 5 ml marks and optional 1 ml adjustments. All real source quantities remain unchanged. No whole-cocktail auto-complete.

Optional Free Pour: hold to dispense, release to stop; tap-to-toggle alternative. Both styles use identical ingredients, inventory, scoring, and recipe targets. Stir/shake starts with one deliberate action and short visible progress. No mandatory phone motion, repeated taps, or precise dragging.

## Cocktails and menu
Evaluate ingredient identities, individual amounts, ratios, serving yield, method, ice, glass, and garnish. A double-sized drink is not a perfect single order. Preserve flexible addition order where the recipe permits it.

Seed techniques: Old Fashioned, Margarita, Manhattan. Start with three active recipes; allow up to six selected between shifts. Expand the catalogue after verification. Regional variants remain separate. Unclear screenshot names stay recorded until identified.

An accepted guest modification creates a target variant before preparation. A social lie never changes actual contents or creates ingredients.

## Sweet lies and regulars
Mara wants a romantic ingredient story. The cherries really came from a supermarket jar. Saying so cancels her order; a believable local-family story succeeds. No provenance UI, supplier notes, delivery records, or truth/lie markers.

Other individuals value different things. Some enjoy a small story; others dislike extravagant claims. A practical regular can prefer a plain answer. Reactions depend on the person and context, never a demographic stereotype.

Usually three English choices and one or two turns; rare stories can reach three. Short options, expressive faces, no response countdown. One active dialogue and one waiting request. The three-encounter cap applies to optional social invitations; actionable complaints, payment or ordering exchanges are available when needed and do not get blocked by that cap. Long stories are invitations, not forced interruptions every time an order is selected.

Remember stories by customer and subject. Later callbacks reward consistency or allow a believable recovery. No hidden supplier trivia. Perceived trust is rapport, not a truth score.

The current latest story controls callback eligibility; keep previous stories as history. Display names are labels, and canonical customerId values link saves and encounters. Eighteen encounters are enabled for the slice; six are staged for later recipes or systems.

The content seed combines service exchanges and social stories; aim for 40–60 edited encounters before content-complete. Quantity is not evidence of writing quality.

## Supporting mechanics
| Mechanic | Revised role |
| --- | --- |
| POS | Open tabs from accepted orders; one clear ordinary settlement action, animated terminal/receipt. Detailed itemization, correction, and splitting when needed. No recurring manual total entry. |
| Cleaning | A short wipe or tap alternative; clean/dirty glasses clearly marked. Early mess does not disable every station. |
| Food | Later add two warmed snacks, one heating slot, ready/cooling states. No full raw-food cooking tree or random burns initially. |
| Stock/ice | Costed editable Restock to Par proposal; actual wastage counts. Ice remains a visible useful task. |
| Closing | Stop new orders at service second 360; finish the normal phase at 420, with up to 90 service seconds to resolve confirmed orders. Preserve served unpaid tabs until manual settlement. Then complete three short goals: clear/clean, trash, stock/ice check. Target 30–60 seconds of input. |
| House Dice | Optional after hours; five dice, keep selected dice, one reroll, highest sum wins. A named house variant, not a claim of regional accuracy. Cosmetic tokens only. |
| Stool comedy | Infrequent authored wobble/slip at a safe moment. No forced input loss or unavoidable penalty. |
| Customization | Wood/wall colours, signage, plants, stools, jukebox, and small furniture. Validate paths and interaction points. |
| Barback | One worker, configurable ice/glass/waste/restock priorities, actual travel and stock. Cocktail assembly stays with the player. |

## Added systems
- Selectable nightly menu: manageable learning and meaningful stock decisions.
- Regular memories: usual order, accepted preferences, rapport, selected story callbacks.
- Practice Bench: no-failure mixing outside service.
- Independent comfort options: patience, service speed, measuring assist, hold alternatives, UI scale, motion.
- Small shift goals reward one skill without blocking progression on failure.
- Local end-of-shift recap names one useful improvement.
- Versioned local save/resume and import/export. No cloud sync implied.

## Removed or reduced
No open world, online multiplayer, destructible voxel terrain, full fluid simulation, ragdoll pileups, mandatory screen shake, repeated scrubbing, full keypad payment on every sale, forced dice grind, or endless nightly shopping list at launch.

No automatic whole-drink crafting. No provenance feature. No universal honesty bonus. No recipe changes after a drink has been prepared.

Continuous temperature/dilution and freshness simulation are deferred; first-slice ice and chilling use explicit state flags and source-method constraints. Preparation animations abstract longer real-world techniques.

## Difficulty and recovery
Modes: Chill, House Shift, Rush. Same core content across modes; Rush is opt-in. Service pacing and measuring assistance are independent.

Arrival spacing, party size, active drink lines, patience, dialogue frequency, food, and order modifiers are explicit configuration. Never tighten all of them together. Give a clear warning before a guest leaves.

After two recent cancellations, defer new admissions for a breathing window. Existing consequences remain; do not restore consumed stock. Poor shifts reduce tips and optional upgrade speed, without debt/rent collapse. Provide a small next-shift starter supply if otherwise impossible to reopen.

House Shift initially assumes 39 seconds active work per group and 58 seconds between groups: about 67% planned occupancy. If a novice needs 55 seconds, occupancy becomes about 95%. Replace estimates with real touch times before adding difficulty. Seating caps alone do not balance service.

## Time policy
| Context | Service | Held input and preparation | New guests |
| --- | --- | --- | --- |
| Overview, normal workstation, ordinary POS | Runs at selected service speed | Valid active interaction only | Workload/capacity gated |
| Dialogue, recipe book, detailed POS, settings, pause | Paused | Stopped; held input cleared | Paused |
| Hidden tab or app interruption | Paused until explicit Resume | No backfilled pour or progress | Paused |
| Practice | No service | Practice actions only | None |
| Closing/customization/after-hours dice | No new service admission | Relevant actions only | None |

The service-speed setting scales customer/service timers. Physical input and short interaction animations remain responsive in real time; documentation and save data distinguish these clocks. Reading pauses intentionally favour comfort in this single-player game. Cooldowns use service time, so reopening a panel never produces income or new conversation opportunities.

## Art, audio, and feedback
Warm wood, cream labels, muted bottle greens, cherry red accents, restrained teal neon. Short expressive voxel people, distinctive silhouettes, readable faces. One voxel scale and material palette.

Validate one finished corner, one bartender, one regular, and a complete pour/serve/reaction sequence before filling the room. Scene readability must survive disabling bloom and dynamic shadows. This is a quality check, not an additional approval workflow.

Use bottle glugs, a rising pour sound, ice clinks, shaker texture, receipts, and quiet ambience. Important sounds have visual equivalents. A customer reaction is more useful than many floating score counters.

## Release gates
1. Control proof: one real recipe can be made and served on a real phone without an input trap.
2. Visual proof: one coherent finished corner and expressive regular at phone size.
3. Vertical slice: complete small shift, three recipes, menu reading, one sweet-lie conversation, basic POS, cleaning, save/resume.
4. Systems pass: measured balance, detailed POS, food, closing, upgrades, regular memory.
5. Content pass: verified wider menu, edited dialogue, optional dice, stool vignette, decor.
6. Delivery pass: base-path-safe build, Pages deployment, Android/iPhone/desktop checks, interruption recovery.

No gate has passed as a playable build. Research and data validation do not establish fun, performance, compatibility, or live deployment.

