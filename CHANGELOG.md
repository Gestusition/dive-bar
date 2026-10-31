# Changelog

All notable changes are recorded here. Versions describe tagged source releases; GitHub Pages follows `main` and may show a different revision. This project is still an early playable release.

## [Unreleased]

### Added

- Staff work with their own hands. The bartender and the host have jointed arms with elbows and hands with fingers that close round what they handle, stepping up to the counter and leaning in when it is further away, and they look at the work. At the sink a glass is held in one hand and scrubbed with the other under the tap; the sponge and the trash bag are held in the hand.
- Each step of a drink is done the way a bartender does it. The tools wait on a ribbed bar mat: tin, vessel, jigger, strainer, muddler, bar spoon and a garnish tray. A bottle with a steel pourer comes up from the rail under the counter and is tipped from the wrist into a jigger held by its waist between two fingers at the mouth of the vessel, then the jigger fills and is rolled over to empty (or the bottle pours straight in with free pouring). Bitters go in with a sharp flick of the wrist per dash, and a sugar cube in a pinch. Ice comes from a scoop, the cubes dropping one after another. For a shake the tin goes on, the vessel comes up across the chest in both hands and is driven along its length while the tin frosts over. For a stir the spoon's bowl runs round the wall of the glass with the shaft pinched in the fingers and the ice following it, while the other hand steadies the base; the glass mists up. A muddler is pressed and turned, and the sugar goes as it is worked. Moving on to the garnish step puts the strainer on and pours the drink across in a stream, the mixing ice staying behind. A garnish is carried from the tray in a pinch and set on the glass. A new vessel or glass is put on the mat by hand, and a glass is chilled by swirling ice in it and tipping that out.
- Liquid behaves like liquid, drawn the way Half-Life: Alyx draws it. In every bottle, glass, vessel and the jigger the surface stays level in the room however the container is turned, its height found from the volume inside, so tipping a bottle sends the liquid down into the neck and it only runs once it reaches the spout. The surface swings when the container is moved and settles on a spring, rings where a stream lands, and carries a head of foam after a shake. This is a shader and a spring, not a fluid simulation: there is no refraction of what is behind the liquid.
- Pours are real streams: a curved tube leaving each lip along the way it points and falling under gravity, thinning as it speeds up, with drops thrown up where it lands. A vessel fills as the stream arrives rather than when the button is pressed, and ice floats in it.
- Bottles, glasses and tools are turned from smooth curves rather than a few facets. Glass has real wall thickness, clear where you look through it and bright along its edges; the mixing glass and rocks glass are cut with facets; a chilled glass mists over. Bottles are see-through with what is left in them showing, printed paper labels following their curve and steel pourers. The bar spoon has a twisted shaft and the strainer a real spring. The bottles on the back shelves are the same bottles, in place of the voxel ones.
- Garnishes are the real thing: citrus slices with their segments showing, cherries with a dimple and a bent stem, a twisted strip of peel, mint with toothed leaves, celery with a ribbed stalk and leaves, and a rim of separate salt grains. The garnish tray holds them too.
- The characters and the room stay voxel, as the game's own style.
- Behind the bar, staff stand on raised boards, so the counter comes to their waist.

- Guest bubbles show how a guest feels about their drink. A heart means happy (a taste score of 75 or more), no icon at all means the drink is only all right (55 to 74, still tipped), and a broken heart means unhappy: too poor to tip on, or leaving without a drink. Their card says the same.
- Guest cards and conversations show the guest's face instead of their initial: their real 3D head, rendered once from the same voxel model, material and light colours as their body in the room, turned slightly and seen from a little above. A change to the model shows on the card too. Where WebGL is unavailable, a flat front view drawn from the same parts is shown.
- A Full back bar setting for a harder pour. The Pour step then lists every bottle, with no amounts to aim for, no check marks and no tick on the step. The recipe list stays the default.
- Owned decor can be put away and brought back out, one piece at a time, from Decorate. Decor that is put away leaves the room and stops adding to tips; a put-away jukebox stops the music and put-away door lights stop drawing guests in sooner.
- A hired host can be sent off duty and brought back from Decorate, with no refund and no second charge. Off duty, the host leaves the room, the player seats guests and cleans up, and any job the host was doing passes to the bartender.

### Changed

- The working mat, the sink and the drink being made sit on the staff side of the counter, within the bartender's reach, and the drink is drawn life-size. The ice well no longer overlaps the sink. The counter close-up frames the bartender as well as the drink.
- The host greets an arriving party from in front of the waiting spot and shows the way from beside each seat, instead of standing in the guest's path.
- Thin scrollbars in the game's colours, without arrow buttons, replace the browser's default scrollbars.

### Fixed

- A device save the game could not read was deleted when the game started, so an update that did not recognise a save lost the player's bar. It is now kept on the device, the title screen says so, and it comes back once the game can read it. Saves from a newer version are recognised as newer instead of damaged.
- Saves now record their layout version and are upgraded step by step when loaded, instead of depending on each new field being given a default by hand. Backups from v0.0.3.2 and v0.0.3.3 load with all their progress, checked by tests on real backups from those releases.
- The glass being washed no longer sinks into the counter or stands in front of the tap. It is held over the basin in both hands, tilted with its rim under the tap's spout, and turned round while water runs into it, with suds at the rim. It and the glasses waiting beside the sink are the real glass the latest drink was served in, the same shape as at the counter, instead of a plain cylinder.
- The trash bin is round instead of visibly ten-sided.
- The host waits further along the front of the room, away from the way out. Guests leaving from the tables and stools at the back no longer brush past the host or look like they walk through them.
- People no longer walk into or through each other. Guests, the host and the bartender are one crowd: guests used to see only the host, and the bartender saw nobody and nobody saw the bartender, so at the counter the host and the bartender could pass through each other. A route round the furniture is planned only when someone's destination changes; getting past other people is done by steering on every frame, so it neither stutters nor lets anyone cut through. This holds with or without a host. In a tight spot, someone standing about steps aside and then goes back, and where there is room for only one, such as between a stool and a table, one of two people meeting head on backs out and lets the other through. Two people with spots side by side stand still instead of nudging each other. Whoever has been held up longest has the right of way, and nobody ever walks through anybody: someone stuck for a long time walks back and tries again. People keep a full arm's width apart in every direction and pass wider when there is room, since walking close in front of someone looks like walking into them on screen. Everyone keeps clear of seated guests too, instead of brushing through them on the way past a chair, the bartender serving a table stands on the clear spot in front of the chair, and a guest leaving keeps clear of anyone coming in until they are out of sight through the door.
- Guests walk in through the door from out of sight one behind the other and walk on out of sight when they leave, instead of appearing and disappearing in the doorway. A guest held up on the way out hurries, so nobody vanishes in the middle of the room.
- Guests sit down in a chair at a table from the side, along the gap between its back and the table, facing the table, instead of walking through the back of the chair.
- Sitting down and getting up are smooth: guests slow to a stop and set off gently, the walking sway fades out instead of stopping dead, and every character's card face is drawn while the title screen is up instead of stalling the frame when their card first opens.
- The first dirty glass, the first bottle and the first look at the counter no longer stall a frame. Every shader is compiled while the title screen is up, instead of the first time something using it comes on screen.
- The tip shown when a guest leaves stands above their bubble, where it can be read, instead of behind it.
- The scene's React tree no longer redraws on every 250 ms clock tick, and the drink's liquid is no longer rebuilt on each tick while the counter is open.
- Shake now shakes. Drinks made in a rocks glass or built in their glass used to stay on the counter while the hands rested on them; whatever the drink is made in is now lifted, closed with the tin and shaken hard in both hands.
- Pouring shows while it happens. With free pour, the bottle used to appear only after the button was let go; it now tips for as long as the button is held, with a stream down to the liquid, which rises as it pours.
- Every ingredient has its own bottle at the counter, matching its card: whiskey, tall clear spirits, a tequila taper, wine-shaped vermouth, a round liqueur flask, a bitters dasher in its paper wrapper, a juice jug, a soda can, a syrup bottle. The back bar shelves show bottles of different shapes too.
- Bottles and tools are held from behind, so the bartender's hand no longer swallows them. The work sits beside the bartender's face, they turn slightly towards it, and the arm no longer crosses in front of their eyes when stirring or pouring. Ice falls from the scoop into the glass.
- Garnishes sit tidily on the glass. Up to ten can still be added, but only a few of each are drawn, so they no longer spill round the rim in a long arc.
- Bubbles of guests sitting close together on screen move apart instead of covering each other. The trash bag is a smaller bag hanging from the carrying hand.
- Guests no longer step back and forth by the door while the host comes to greet them, and no longer step back out of their chair when their route is refreshed on the way in.
- Guests rise onto their seat over their last steps in and ease back down when they get up, instead of jumping between the floor and the seat in one frame.
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
