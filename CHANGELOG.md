# Changelog

All notable changes are recorded here. Versions describe tagged source releases; GitHub Pages follows `main` and may show a different revision. This project is still an early playable release.

## [Unreleased]

### Changed

- The host greets an arriving party from in front of the waiting spot and shows the way from beside each seat, instead of standing in the guest's path.
- Thin scrollbars in the game's colours, without arrow buttons, replace the browser's default scrollbars.

### Fixed

- Guests no longer step back and forth by the door while the host comes to greet them, and no longer step back out of their chair when their route is refreshed on the way in.
- Characters held up by someone keep facing the way they were walking instead of turning round and back. The host turns smoothly and walks one route to where it is heading.
- Guest cards are measured once a frame before they are moved, so the page is no longer laid out again for every guest on every frame.
- The plants no longer line up with floor seams and wall battens, which made the lines look as if they ran through the pots. The battens now continue the floor seams up the wall.
- The door string lights hang on a cord with evenly spaced bulbs.
- The bar sign faces the camera, so its lettering no longer looks stretched sideways.

## [0.0.3.3] - 2026-10-30

### Fixed

- Service no longer stutters once the host is hired. Guests, the host and the bartender plan their walks when their destination changes, and around other people a few times a second, instead of on almost every frame while someone else was moving or in the way.
- A guest and the host who stop just clear of each other no longer wait for each other indefinitely; the one who is moving first steps away and walks round.
- Guests escorted by the host always sit down in their seat. A route refreshed on the way into the chair no longer sends them back out, and the host no longer waits for good when its return spot is beside a guest.
- Each character's body is built once per game rather than for every arriving guest, so arrivals no longer stall a frame or leave old bodies on the graphics card.
- The same drink is never ordered by more than four guests in a row while the menu has another drink. Repeat orders are still possible.

## [0.0.3.2] - 2026-10-30

### Fixed

- The host and the bartender no longer walk through the trash bin. The bin stands clear of the counter-end walkway, and staff empty it from beside it instead of appearing inside it.
- On short landscape phones, the hint and notices move to the top of the scene while a guest card is open in the lower half, so they no longer cover its buttons.

## [0.0.3] - 2026-10-29

### Added

- Timed cleanup jobs with staff walking, a wiping sponge, a working sink and glass-washing animation, a carried trash bag, and visible progress. Hired hosts automatically handle closing cleanup; otherwise the bartender performs requested jobs. Work pauses with the game and reading dialogs.
- Guests can ask for the other snack instead of the one offered.

### Changed

- Fresh bars start with six menu drinks; menus and validated saves support all fourteen recipes.
- Bartending hints switch off automatically at the next night, while remaining available in Settings.
- Snack offers are equally likely to be accepted or declined.
- Shortened snack offer labels to fit the guest card.
- Removed the em dash from the opening menu instruction.

### Fixed

- Departing guests and the host avoid one another instead of crossing through each other's bodies.
- Drink orders no longer favour regulars' default recipes. Live selections draw fresh Web Crypto randomness; deterministic story fixtures do not assume live Manhattan orders.
- Snack offers can be declined, and repeat offers cannot reroll a refusal. Accepted snacks consume stock and add a serving charge only once.
- Restocking no longer blocks closing the bar, including when the till cannot cover more supplies. Cleanup ticks appear only after the worker completes the job.
- Fresh profiles and new games no longer receive every decor upgrade and the host for free. New game clears transient service state and immediately replaces the previous local save.
- The hired host is positioned inside the room independently of responsive side walls and walks to greet guests, escort them to their seats and return.

## [0.0.2] - 2026-10-29

### Added

- Guests can arrive in pairs, share tables, order individual drinks and request one bill or separate bills. A purchasable host seats waiting guests and helps wash glasses.
- Bartending coaching, hold-to-shake/stir/muddle controls, removable garnishes, visible drink preparation and itemized taste deductions.
- Decor with gameplay effects, guest tip feedback, recorded bar sound effects and a licensed jukebox track.
- Strictly validated, encrypted and signed device saves and `.divebar` backups, with size limits and rejection of damaged files.
- Regression coverage for serving boundaries, party payments, stock accounting, cancellation, save integrity, clock pauses and interrupted input; real-browser checks for backup handling and preparation mistakes.
- Project-specific agent instructions, pull request template and refreshed in-game README screenshots.

### Changed

- Serving now requires every required ml ingredient to be within ±18% of its target, with a minimum 1 ml allowance. Discrete quantities retain their exact recipe ranges. Perfect taste scoring keeps its stricter ±5% / 1 ml margin.
- Browser journeys use current held-input controls and signed story fixtures instead of assuming a random guest always orders a Manhattan. The service clock helper preserves simulation ticks while coalescing intermediate frames.
- CI builds once, then tests desktop Chromium, Firefox, landscape Chromium and landscape WebKit on four separate runners before allowing Pages publication. Local tests use two workers; CI uses one per runner.
- Improved side-rail sizing, scene layout and decor, and mobile full-screen restoration after switching apps. Development permits local-network and forwarded-port access.

### Fixed

- Restocking no longer erases stock above par and charges fractional refill quantities correctly.
- Fractional snack purchases are rejected instead of creating a save that cannot be reloaded.
- Cancelling a cocktail through dialogue preserves an already served snack's unpaid bill.
- Remake-level drinks cannot receive tips through conversation or ambience bonuses.
- Vessel capacity checks consistently convert every dash ingredient to volume.
- Overpours and overmixing no longer receive misleading completion ticks or coaching; drinks with no required garnish complete that step without an unnecessary addition.
- Updated obsolete test assumptions about ingredient mixing, tip amounts, partial payments, random customers, counter routes and renamed controls. Root `.mjs` tools receive Node globals in ESLint.

### Compatibility and limits

- Older save formats are refused; start a fresh bar. Back up any supported save before upgrading. The save seal's key ships in the client and is not a defense against a determined reverse engineer.
- Mobile browser profiles are emulated. Physical-phone performance, real iOS input/audio behavior, extended human playtesting and long-term balance remain unverified.
- No production timer, patience, rendering quality or game speed was changed to shorten tests.

## [0.0.1] - 2026-10-27

Initial tagged playable release: fourteen recipes, a voxel bar, manual cocktail preparation, service and dialogue, stock and integer-money accounting, shift closing, local saves, desktop/touch controls and GitHub Pages delivery.

[0.0.3.2]: https://github.com/Gestusition/dive-bar/compare/v0.0.3...v0.0.3.2
[0.0.3]: https://github.com/Gestusition/dive-bar/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/Gestusition/dive-bar/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/Gestusition/dive-bar/releases/tag/v0.0.1
