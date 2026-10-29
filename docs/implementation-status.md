# Implementation status

Updated 29 October 2026. The released baseline is 0.0.2; the work recorded below is ongoing development toward 0.0.3. This file describes the executable game; older design documents record targets and may include richer future behaviours.

## 0.0.3 progress — in development, not ready for release

All work from this development session belongs to the planned 0.0.3 update. Version 0.0.3 is not ready, tagged or published; completed local changes and passing checks do not establish release readiness. Package metadata remains at 0.0.2 until release preparation.

Implemented locally:

- Fresh profiles and New game start with the host and all seven shop upgrades unowned. New game clears transient work and replaces the previous local save immediately.
- The hired host is visible inside the room and follows routes to greet and escort guests.
- Restocking is optional for closing, including with an empty till.
- Wiping, washing glasses and taking out trash use timed jobs, staff movement, visible tools and progress. The host handles closing cleanup automatically; otherwise the bartender performs queued jobs. Completion ticks and cleanup effects occur after the work finishes, and pause or reading dialogs stop progress.

Local verification completed: 89 unit tests; 20 desktop browser tests passed with one phone-only test skipped; both cleanup scenarios passed across all four browser profiles. Final desktop checks also covered cleanup stages and reading pauses. Content validation, formatting, lint, type checking and the production build passed. The complete four-project browser suite for the final release candidate and release preparation remain pending. Further 0.0.3 work may continue before the version is declared ready.

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

The regression suite also covers save sealing against standard SHA/HMAC implementations, backup round trips and tampering, malformed saves, party payment replay, fractional stock costs, surplus restocking, cancelled drink snack bills, and store clock/queue pauses. Story browser tests import signed fixture backups through the player's import UI; fresh-game browser tests still exercise normal randomness.

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
