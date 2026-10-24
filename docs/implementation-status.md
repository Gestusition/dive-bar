# Implementation status

Updated 25 October 2026. This file describes the executable game; older design documents record targets and may include richer future behaviours.

## Playable scope

The application contains a complete single-bartender shift loop: opening, guest arrival and seating, menu reading, ordering, manual cocktail preparation, drinking, split tab payments, last call, cleanup and the next night. The fixed voxel room and workstation are authored with Three.js geometry. Desktop and portrait touch layouts share the same simulation.

Fourteen recipe cards include source references and explicit house variations. Measures preserve ml, dash, piece, pinch and bar-spoon units. Quality checks ingredients, quantity, ratio, single-serving yield, mixing tool, method, ice timing, serving glass and garnish. Inventory is consumed when used. Practice has separate unlimited supplies. The warm-food slot, editable nightly menu and restocking, trash, washing, decor and barback purchases are functional.

Customer conversations are authored English choices with rapport, patience, order and tip effects. The cherry encounter rewards a plausible orchard story and rejects the supermarket answer, without displaying provenance or truth badges. Story history supports callbacks. The 24 source encounters are filtered for appropriate runtime contexts; this is not a claim of 24 randomly interchangeable encounters per shift.

Local saves use IndexedDB. Export/import validates the save shape and known content IDs. Payment accounting uses integer minor units; repeated settlement cannot duplicate revenue or tips. Reading dialogs and hidden tabs pause service; interrupted free pouring stops and needs deliberate input to resume.

## Verification

Automated unit tests cover all recipe specs, quantity and technique mistakes, stock, purchases, menu selection, dialogue replay and story callbacks, payment replay and split payments, snack billing at closing, save validation and shift transitions. Browser tests exercise the actual production WebGL renderer and a complete Manhattan order, conversation outcomes, practice, pause/reading, closing, keyboard handling and interrupted pouring.

The browser matrix uses desktop Chromium, desktop Firefox, Pixel 7 Chromium emulation and a narrow 390 x 844 touch WebKit context. WebKit deliberately uses desktop browser semantics at a phone-size viewport: native Windows display scaling made full iPhone emulation scroll fixed dialogs inconsistently. This is not an iPhone Safari certification. Physical-device frame rate, heat, battery, audio policies and real iOS/Android input remain unverified.

GitHub Actions repeats formatting, content validation, lint, TypeScript, unit, production build and all four browser projects. Main deployments publish only after these checks. Dependabot proposes grouped updates without automatic merges. Preview publication and a passing pull request do not imply a merge to main.

## Deliberate limits

- Guests are individual parties with one cocktail each. The split POS divides their bill; it does not model multi-person table ordering.
- Social encounters and stool comedy are scripted. There is no generative dialogue or physics ragdoll system.
- The bartender queue handles service errands. Cocktail preparation remains direct player interaction.
- One warming slot and two snacks keep food secondary to cocktails.
- There is no cloud save, multiplayer, real payment service or server requirement.
- The visual direction is an original voxel interpretation of the reference's readable service composition. No reference game's proprietary artwork is copied.
- Gameplay timing has deterministic automated coverage; broader human playtesting and long-term progression balancing remain useful before calling this a commercial release.

See README.md for commands and docs/recipe-research.md for the screenshot-name research. Build/test results and deployment status should be read from current CI and the delivery report, not inferred from this feature inventory.
