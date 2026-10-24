# Acceptance scenarios — slice-0.1

These are implementation acceptance criteria, not tests that already passed. Use them as milestone checks once code exists. Do not claim gameplay readiness from content validation.

| ID | Scenario | Required observable result |
| --- | --- | --- |
| A01 | Make a 50/20/15 ml Margarita, shake with ice, strain into chilled cocktail glass | Correct recipe/method, no required salt-rim warning, one valid serving |
| A02 | Make a 100/40/30 ml Margarita | Correct proportions do not conceal the invalid single-order yield |
| A03 | Use bourbon instead of tequila | Wrong base is identified; invalid-serve warning and remake path |
| A04 | Change order of Margarita ingredient additions | No penalty if ingredients precede shaking and correct straining |
| A05 | Build Old Fashioned with bourbon, then repeat with rye | Both source alternatives valid; no forced bourbon-only target |
| A06 | Use 2 versus 3 dashes in each Old Fashioned range slot | Both accepted, without a hidden ratio/yield penalty |
| A07 | Skip sugar dissolution, or shake a Manhattan | Specific method issue reported; wrong primary method cannot score Good |
| A08 | Transfer half a mixed vessel and return it | Native component quantities conserve; no ingredient disappears or duplicates |
| A09 | Change jigger side while nonempty | Explicit empty-first handling; no hidden second measure |
| A10 | Finger leaves control, browser cancels pointer, tab hides or a call interrupts | Pour stops; no negative stock or resume backfill; new deliberate action required |
| A11 | Pause dialogue while a drink/guest has pending work | All declared service timers stop; held work cannot keep progressing |
| A12 | Truthful supermarket answer versus plausible orchard story | Truth cancels Mara's affected unserved order; plausible lie continues; no sourcing screen exists |
| A13 | Mara returns with/without the current local_family_orchard memory | Callback only available with exact current customer/subject/story match |
| A14 | Double-tap a response, Serve or Pay | One effect, one serve and one settlement/tip at most |
| A15 | Fill work budget with admitted guests awaiting orders | Further admission/round cannot exceed cap even if seats are free |
| A16 | One guest in a two-person party receives a drink | Their state changes; the other guest does not become served automatically |
| A17 | Remake an incorrect drink twice | Attempts remain attached to one line; spent stock remains spent; only one active attempt |
| A18 | Reach last call and grace deadline | No new orders; unfinished lines resolve; existing bills remain payable; shift can close |
| A19 | Pay an already-settled tab or reload after payment | No duplicate revenue/tips; same stored total and paid state |
| A20 | Import invalid/unknown-version save or storage write fails | Last good save survives; error and export/recovery are available |
| A21 | Lose supplies and cash, then reopen | Exactly one configured starter supply grant for the shift; practice stock cannot fund service |
| A22 | Open slice content registry | Only enabled IDs with implemented predicates/handlers are selectable; deferred recipes never silently substitute |
| A23 | Portrait, landscape, enlarged UI and keyboard-only navigation | All required actions remain reachable and readable; no gesture-only action |
| A24 | Block an interaction route with editable furniture | Invalid placement prevented or an explicit fallback route/error; no permanent deadlock |
| A25 | Disable sound, bloom and dynamic shadows | Essential state and actions remain understandable |
| A26 | Ten-minute real-phone play plus scene/asset loading | Record actual device/browser, FPS/frame pacing, load size and interruption results; do not substitute emulator-only evidence |
| A27 | Build and open actual GitHub Pages repository URL | Base-aware assets load, reload works, save works; local build alone does not count as deployment |

## Milestone recording
For each applicable criterion record pass/fail/not run, evidence and environment. M1 focuses on A01–A10; M3 adds service/economy; M4 adds social/persistence; M5 covers the full applicable set. A24's full customization portion belongs to the later systems release, but initial fixed navigation must still be reachable.

All entries are currently Not run.

