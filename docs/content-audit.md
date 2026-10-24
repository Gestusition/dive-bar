# Final planning/content audit — 24 October 2026

> Historical planning baseline. A playable runtime now exists; see [implementation-status.md](implementation-status.md) for actual scope and validation limits.


Baseline: slice-0.1. Status: ready to begin implementation; no game runtime, build or deployment exists.

## Final local structural validation
- Six JSON files parse, including the planned toolchain registry.
- Twelve canonical customer IDs match dialogue display labels and registered default recipes.
- Three recipe seeds have registered ingredient units, stock items, serving glass aliases, ice profiles, garnishes and prices.
- Twenty-four encounters contain 32 reachable nodes and 96 choices, with no branch cycles or duplicate encounter/local choice IDs.
- Eighteen encounters are selected for the slice; six are explicitly deferred. Every encounter belongs to exactly one tier.
- All 18 slice encounters have event bindings; their 22 predicate IDs are registered.
- All orderChange references resolve to a source recipe, registered modifier/POS action or explicitly deferred recipe.
- Enabled slice encounters do not depend on a deferred drink or advanced modifier.
- Fourteen story variants are recorded. The cherry callback resolves by canonical customerId, subject and story.
- Mara's truthful supermarket answer still cancels, the plausible family-orchard story continues, and there is no provenance lookup branch.
- Registered modifier slots, recipe references, garnish IDs, stock units and glass aliases resolve.
- Quality weights total 100; omitted optional garnish has zero penalty.
- Shared phases cover 420 service seconds without gaps. Last orders at 360 and the finishing grace rule are explicit.
- Optional social caps do not block service complaints, remakes, ordering or payment.
- Twelve Markdown files have paired code fences. Ten relative Markdown links resolve.
- Four Mermaid blocks are present; their diagrams were structurally reviewed but were not rendered by a Mermaid engine.

## Resolved in the final polish
- Customer identity is independent of display names.
- Party membership has VisitGuest records and independent guest progress.
- An order line can retain many remake attempts, with only one active attempt.
- Admission reserves work slots for guests who have not ordered, preventing a hidden overload.
- Slice content and later content are explicitly separated.
- The menu-wait recommendation now uses the registered Margarita rather than an absent recipe.
- Prices, stock, calibration, tools, modifiers, technique animations and quality labels have a starting registry.
- Dash/source units and capacity approximations are distinguished.
- An Old Fashioned's accepted dash range cannot incur an invisible ratio penalty.
- Last call, confirmed-order grace, unfinished orders and unpaid bills have terminating rules.
- Real-time interaction and scaled service timers are separated.
- Spending on restock is distinguished from consumed-stock cost, preventing double cash debits.
- Story callbacks use the current story, not any older contradictory history.
- Save/import, duplicate actions, interrupted gestures, practice inventory and starter recovery have explicit contracts.
- Development entry point, module boundaries, milestone exits and 27 acceptance scenarios are written.

## Deliberately deferred, not missing from the first slice
- sweetness, last_train and sold_out wait for later verified drinks.
- split_bill, stronger_drink and remembered_preference wait for systems-stage capabilities.
- Less-sweet and combined modifiers are registered for that stage; extra_cherry is supported in the slice.
- Detailed POS, food, barback and full customization are systems-stage work.
- House Dice and stool comedy are optional after-hours work.
- Ambiguous screenshot drink names remain in requirements.md until identified and sourced.

## Remaining validation requires an implementation
The user-selected React/R3F direction is now recorded with Vite, Tailwind v4, selective shadcn, Zustand, Bun, Vitest, Playwright, GitHub Actions/Pages and Dependabot. Stack pairings, lockfile policy, delivery policy and local document links were checked structurally; no packages or workflows were installed/created and no unit/E2E tests were run.

All 27 scenarios in docs/acceptance.md are currently Not run. Runtime predicates and outcomes, pathfinding, scoring, inventory, payments, save migrations, touch controls, art, audio, performance, production build, CI and live Pages delivery still require code and verification.

Balance, costs, stock, durations and rendering budgets are initial design values. The workload figures (39/58, about 67%; novice 55/58, about 95%) are arithmetic sensitivity estimates, not simulated or observed player performance. Real-device checks and editorial playtesting remain release gates.


