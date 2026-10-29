# Implementation status

Updated 29 October 2026 for 0.0.2. This file describes the executable game; older design documents record targets and may include richer future behaviours.

## Playable scope

The application contains a complete single-bartender shift loop: opening, guest arrival and seating, menu reading, ordering, manual cocktail preparation, drinking, split tab payments, last call, cleanup and the next night. The fixed voxel room and workstation are authored with Three.js geometry. Desktop and landscape touch layouts share the same simulation.

Fourteen recipe cards include source references and explicit house variations. Measures preserve ml, dash, piece, pinch and bar-spoon units. Quality checks ingredients, quantity, ratio, single-serving yield, mixing tool, method, ice timing, serving glass and garnish. Inventory is consumed when used. Practice has separate unlimited supplies. The warm-food slot, editable nightly menu and restocking, trash, washing, decor and barback purchases are functional.

Customer conversations are authored English choices with rapport, patience, order and tip effects. The cherry encounter rewards a plausible orchard story and rejects the supermarket answer, without displaying provenance or truth badges. Story history supports callbacks. The 24 source encounters are filtered for appropriate runtime contexts; this is not a claim of 24 randomly interchangeable encounters per shift.

Local saves use IndexedDB. Export/import validates the save shape and known content IDs. Payment accounting uses integer minor units; repeated settlement cannot duplicate revenue or tips. Reading dialogs and hidden tabs pause service; interrupted free pouring stops and needs deliberate input to resume.

## Verification

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
