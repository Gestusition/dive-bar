# Implementation status

Updated 30 October 2026 for version 0.0.3.3. This file describes the executable game; older design documents record targets and may include richer future behaviours.

## 0.0.3.3 scope

Package metadata and the changelog describe 0.0.3.3. Publication requires successful quality checks and the complete four-project production-browser suite for the release commit. GitHub Pages follows `main`; a release from another branch does not deploy that branch.

Implemented:

- Fresh profiles and New game start with the host and all seven shop upgrades unowned. New game clears transient work and replaces the previous local save immediately.
- The hired host is visible inside the room and follows routes to greet and escort guests.
- Guests and the host route around one another, including during departures. Moving-person clearance is checked between route steps; a blocked destination waits instead of allowing an overlap.
- Fresh bars start with six drinks and can select all fourteen. Live drink selection uses fresh Web Crypto draws with equal weight for every menu slot, without a favourite or previous-order bias, except that one drink is never given to more than four arriving guests in a row while the menu has another. Saves made before this streak was tracked still load. Test-only entropy injection preserves deterministic coverage without making live orders deterministic.
- Bartending hints default to enabled for night one and switch off at every next-night transition; the settings switch remains available.
- Snack offers can be accepted or declined. Refusals persist for the visit and through save/reload, preventing repeated offers from rerolling the decision. Stock and billing remain idempotent for accepted snacks.
- Accepting and declining a snack offer are equally likely. Guests can request the other snack, and shortened offer labels fit the guest card.
- Restocking is optional for closing, including with an empty till.
- Wiping, washing glasses and taking out trash use timed jobs, staff movement, visible tools and progress. The host handles closing cleanup automatically; otherwise the bartender performs queued jobs. Completion ticks and cleanup effects occur after the work finishes, and pause or reading dialogs stop progress.
- The trash bin stands clear of the counter-end walkway and is a furniture obstacle; staff empty it from its front left instead of standing inside it.
- On short landscape phones, a guest card open in the lower half moves the hint and notices to the top of the scene so they cannot cover its buttons.
- Guests, the host and the bartender plan walking routes when their destination changes, and around other people at most four times a second (ten while blocked), instead of on almost every frame. Someone starting just clear of another person steps directly away before routing, so two people cannot wait for each other indefinitely. A destination counts as taken only within someone's clearance, and a guest already stepping into their chair carries on; a frame-by-frame test escorts a guest to every seat while the others are taken. Each character body is built once per game. Unit tests bound how often routes are planned; frame rate on physical phones is unverified.

The gameplay baseline at commit `85b55a6` passed the Quality and Pages workflow, including content validation, formatting, lint, type checking, unit tests, the production build and all four browser projects. Coverage includes equal-weight menu selection with controlled entropy, live Web Crypto integration, host/guest clearance, snack decisions, menu persistence, story, cleanup, input and save flows. The same workflow must pass on the release branch before publication; its run records provide evidence for the final release commit. README captures use separate signed showcase backups with all seven upgrades owned and the Rose theme selected. Physical-device testing remains unverified.

## Playable scope

The application contains a complete single-bartender shift loop: opening, guest arrival and seating, menu reading, ordering, manual cocktail preparation, drinking, split tab payments, last call, cleanup and the next night. The fixed voxel room and workstation are authored with Three.js geometry. Desktop and landscape touch layouts share the same simulation.

Fourteen recipe cards include source references and explicit house variations. Measures preserve ml, dash, piece, pinch and bar-spoon units. Quality checks ingredients, quantity, ratio, single-serving yield, mixing tool, method, ice timing, serving glass and garnish. Inventory is consumed when used. Practice has separate unlimited supplies. The warm-food slot, editable nightly menu and restocking, trash, washing, decor and barback purchases are functional.

Customer conversations are authored English choices with rapport, patience, order and tip effects. The cherry encounter rewards a plausible orchard story and rejects the supermarket answer, without displaying provenance or truth badges. Story history supports callbacks. The 24 source encounters are filtered for appropriate runtime contexts; this is not a claim of 24 randomly interchangeable encounters per shift.

Local saves use IndexedDB. Export/import validates the save shape and known content IDs. Payment accounting uses integer minor units; repeated settlement cannot duplicate revenue or tips. Reading dialogs and hidden tabs pause service; interrupted free pouring stops and needs deliberate input to resume.

Fresh profiles and New game start with all seven shop upgrades unowned. New game clears transient selections, dialogue and preparation effects, and immediately queues the replacement save. The hired host stands inside the visible room, greets arriving parties and follows furniture-aware paths to their seat approaches before returning to the entrance area.

## Verification

Cleanup runs on the pausable store clock with walking, working and trash-delivery stages. Completion alone clears mess, trash or dirty glasses; duplicate clicks cannot start duplicate work. The host handles closing cleanup automatically and washes dirty glasses during service when no party is waiting. Without a host, the bartender handles requested jobs before queued guest errands. Tools, a sink, water, a bin and a carried bag make the jobs visible. Restocking remains available but does not gate closing. Incomplete jobs restart on request (or automatically for a host) after reload; unfinished effects are not written as completed work.

Automated unit tests cover all recipe specs, quantity and technique mistakes, stock, purchases, menu selection, dialogue replay and story callbacks, payment replay and split payments, snack billing at closing, save validation and shift transitions. Browser tests exercise the actual production WebGL renderer and a complete Manhattan order, conversation outcomes, practice, pause/reading, closing, keyboard handling and interrupted pouring.

The browser matrix uses desktop Chromium (1440 × 1000), desktop Firefox, Galaxy S8 landscape Chromium emulation (740 × 360), and iPhone 13 landscape WebKit emulation. These are emulated profiles, not physical-device certifications. Physical-device frame rate, heat, battery, audio policies and real iOS/Android input remain unverified.

Service checks each required ingredient: ±18% for ml, at least 1 ml allowance, and exact authored discrete quantities/ranges. Taste scoring retains its stricter ±5% / 1 ml quantity margin. Overpours and overmixed drinks do not earn a completion tick; optional garnish requires no addition.

The regression suite also covers save sealing against standard SHA/HMAC implementations, backup round trips and tampering, malformed saves, party payment replay, fractional stock costs, surplus restocking, cancelled drink snack bills, and store clock/queue pauses. Story browser tests import signed fixture backups through the player's import UI; a Manhattan story is an explicitly authored fixture, not a live-order assumption. Live-order tests use the player's menu UI. Snack decision tests control only the random-source boundary to cover both outcomes reliably; they do not replace the renderer or mutate production game state.

GitHub Actions runs formatting, content validation, lint, TypeScript, unit tests and one production build, followed by all four browser projects in parallel on separate runners. Main deployments publish only after these checks. Dependabot proposes grouped updates without automatic merges. Preview publication and a passing pull request do not imply a merge to main.

## Deliberate limits

- Guests arrive alone or in pairs. Pairs share a table, order individual drinks and settle together using their requested one-bill or split presentation. Arbitrary partial-amount card payments are not implemented.
- Social encounters and stool comedy are scripted. There is no generative dialogue or physics ragdoll system.
- The bartender queue handles service errands. Cocktail preparation remains direct player interaction.
- One warming slot and two snacks keep food secondary to cocktails.
- There is no cloud save, multiplayer, real payment service or server requirement.
- The visual direction is an original voxel interpretation of the reference's readable service composition. No reference game's proprietary artwork is copied.
- Gameplay timing has deterministic automated coverage; broader human playtesting and long-term progression balancing remain useful before calling this a commercial release.

See README.md for commands and docs/recipe-research.md for the screenshot-name research. Build/test results and deployment status should be read from current CI and the delivery report, not inferred from this feature inventory.
