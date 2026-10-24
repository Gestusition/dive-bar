# Resolved gameplay contracts — slice-0.1

These resolve implementation questions left open in earlier planning. All tuning values are game design, not real bartending standards. Canonical values live in data/vertical-slice.en.json and data/balance.en.json.

## Groups, guests, and work budget
A Visit is one arriving party with one tab. VisitGuest links a Customer to that visit; each guest has their own reading/order/drink state. A single visit-level state is derived from its guests. WaitingOutside is a group state.

Before seating, reserve one initial drink slot per guest. Count open unfulfilled lines plus admitted guests whose first order is not yet placed. This total cannot exceed maxUnfulfilledDrinkLines. Converting a reserved guest slot into an order line is atomic; release it on decline/departure. Finished/cancelled lines release their work budget.

Later rounds require a fresh work-budget slot. No party can bypass the cap by ordering after admission. Do not spawn an infinite outside queue when full. Seat capacity and collision/path clearance are independent checks.

Two player tasks means current plus one queued. In-flight pour/payment/serve commits cannot be replaced halfway: cancel the interruptible part, retain the committed state, then retarget. Targets are revalidated on arrival.

## Orders, remakes, and service
A line can have many preparation attempts, with at most one active reserved attempt. Keep discarded/rejected attempts for cost and quality history. An old drink cannot serve twice or satisfy a different order without explicit reassignment and revalidation.

One accepted order revision is pinned to each preparation. First-slice extra_cherry adds one cherry to the resolved garnish requirement, with no surcharge. Only Old Fashioned and Manhattan support it. Advanced less-sweet variants are registered for later systems, not implicitly enabled now.

Show a warning before attempting an invalid/wrong-target serve. The player can cancel or deliberately attempt it, enabling the relevant complaint/remake exchange. Practice explains the error without service penalties. A remake never restores already used stock.

## Terminal dialogue actions
| result | State transition |
| --- | --- |
| confirm | Confirm the selected active-menu candidate and registered modifier. If no candidate exists, return to recipe selection without creating a phantom order. |
| cancel | Cancel this unserved line/candidate, release reservations and refund prepayment if any; unrelated charges remain. |
| decline | Guest leaves before ordering without a service-failure penalty. |
| defer | Return to menu reading; preserve identity and assigned seat. |
| reselect | Return to recipe selection; no automatic drink choice or charge. |
| remake | Reject the attempted item, keep its waste/cost history and create a new attempt for the same accepted order. |
| resolve | Close the social event; keep order and visit state unless an explicit effect changed it. |
| offer_move | Move only if the required free seat/table is still valid; otherwise offer to stay with no phantom reservation. |
| payment | Open the current tab's settlement flow; never mark paid just because a response was chosen. |
| review_recipe | Open the pinned recipe/preparation comparison; do not silently change contents. |
| rule_breach | Record the specific house-rule breach for recap/rapport; never create a new after-hours drink order automatically. |

Choice effects commit once per encounter/node/choice token. Reply/Continue and reopening a panel cannot apply them again. Clamp cumulative tip-rate adjustment to the configured range at settlement. Trust is perceived rapport, clamped to [-5,5].

Greeting/before-order-confirm invitations count as optional social scheduling regardless of their legacy content kind. Allow at most one optional invitation per guest per visit, even after recipe reselection. Consume the event opportunity once; closing/reopening cannot reroll it. Required service exchanges use their specific order/event revision and remain available without farming repeated bonuses.

Record story choices immediately when spoken, even if the guest later cancels; they heard the story. The latest story for (customerId, subjectKey) controls future callback eligibility; keep an append-only small history for recap. The callback requires the exact current storyId, not merely an old historical occurrence.

All enabled encounters require actual context predicates. English trigger/cue descriptions are editorial notes. A callback, saved preference, available quiet table, supported recipe, or exact preparation record must really exist before use.

Use encounterBindings events and predicate IDs from the manifest, plus the bank's canonical customerId and any requiresStory. selected_recipe_available means an active-menu candidate with actual stock and a reserved work slot, not a confirmed charge. *_available predicates also check stock, not merely catalogue membership. Named room props and a first-date visit flag are staged content conditions, not inferred from demographic or appearance. If an optional prop/flag is absent, skip its encounter.

## Timing and last call
Service timers scale by the selected service speed. Physical interaction animations and pouring use responsive real interaction time, but stop under global pause. Food/ice progression added later must declare its clock; never use wall time while a focus screen pauses simulation.

Shared phase boundaries use service time. Warmup caps groups at one; every later phase uses the selected mode's group cap. Optional brief-rush multipliers apply only when the mode supports rush and the player opted in.

At 360 service seconds, stop admitting groups and accepting new drink orders. Existing confirmed orders and bills remain. Unconfirmed/menu-reading guests may leave politely with no service penalty. At 420, show Last Call finishing mode for up to 90 more service seconds; no new rounds or social sales.

At the grace deadline, cancel only unfinished unserved lines; preserve spent stock. Guests with served unpaid items remain ReadyToPay until explicit settlement. Payment waiting can lose tips but cannot delete a tab or spawn free money. Once all guests depart and tabs are resolved, switch to closing tasks.

A dialogue or recipe panel pauses all those deadlines. Hidden tabs pause and clear gestures, then require Resume. No catch-up time. After a resumed save, the next frame starts with zero accumulated time.

## Vessels and units
Source quantities remain ml, dash or piece. Capacity is an approximation derived from explicit product calibrations. The profile uses 0.8 ml per dash for its two dash dispensers purely as a game fixture, not a universal measurement or recipe change.

Retain each component's native quantity alongside calibrated liquid volume. A partial transfer moves the same fraction of every dissolved liquid component; fractional dash equivalents can exist internally even though a dispenser emits whole dashes.

Sugar cubes are solid pieces until muddled. After dissolving, track dissolved cube-equivalents in the homogeneous mixture and transfer proportionally. Its volume contribution is ignored in the initial capacity approximation. No full chemistry or physical fluid simulation.

The two jigger sides belong to one tool: empty before flipping. Switching sides cannot hide another full measure. Ice occupancy is configured separately from drink volume; mixing ice is strained out when required.

First-slice chilling is a state flag earned by the chilled-glass action and mixing with ice. Technique animation time is a short abstraction of real preparation. Continuous melting/dilution, temperature chemistry and freshness decay are deferred; do not invent unsupported simulation penalties.

## Quality, explicit initial algorithm
All weighted dimensions produce a 0–1 score, summed with profile weights to a 0–100 result.
- Ingredients: fraction of required slots correctly present, reduced by unexpected additions. Wrong/missing base spirit or an explicitly forbidden ingredient makes the order invalid and caps score at 49.
- Quantities: for each target t, let d be absolute error and e its mode-independent selected assistance tolerance. Score 1 inside tolerance, otherwise max(0, 1 - (d-e)/(0.5*t)); average required slots. For accepted dash ranges, distance is to the nearest point in that range. Missing slots have zero quantity score.
- Proportion/yield: compare measured recipe-input fractions with target fractions using 1 minus total-variation distance, including unexpected measured liquid as extra categories. Yield score is max(0,1-abs(actualInputVolume-targetInputVolume)/targetInputVolume). Average the two. Ignore intentional serving/mixing ice in these input totals.
- The input-yield ratio outside 0.65–1.35 makes a single order invalid regardless of proportions. Garnish and undissolved solids do not inflate yield.
- Match valid alternatives into one target slot. If both bourbon and rye were added to an Old Fashioned, split-source whiskey is not an allowed silent alternative in this baseline; flag the unselected spirit as unexpected.
- Method: satisfy the recipe's technique constraints, without demanding arbitrary ingredient order. Incorrect primary shake/stir caps the overall score at 74. Missing a required dissolution step loses method credit.
- Ice/chilling: half credit each for correct ice placement/retention and required chilling.
- Glass: use the required registered serving shape. Chilling is counted above, not twice.
- Garnish: fraction of required garnish groups satisfied; oneOf groups accept either permitted option. Optional omitted salt rim has no penalty. An extra-cherry request changes the required count.

Use the preferred value for a source 'few dashes' target, but any value in its accepted range has full quantity credit. Calibrated dash volumes are excluded from proportion/yield comparison for range-based slots so 2 versus 3 accepted dashes cannot lose hidden ratio points. Fixed one-dash targets remain checked. Unknown extras must still affect evaluation.

Quality labels: Excellent 90+, Good 75+, Needs work 55+, Remake below 55. Invalid drinks trigger the serving warning/remake flow even if the unbounded sum would have been high. These are tunable game rules.

## Economy and stock
All money uses integer minor units; prices/costs are fictional game tuning. Opening stock is already owned. Restock proposals show quantity and total, can be edited, and commit only if affordable. No overdraft or asset resale in the slice.

A product is consumed when it leaves stock, including spills and waste. Reserving supply is not consuming it. Returning an unpoured reservation is allowed; returning a discarded mixture to a bottle is not.

Consumption changes inventory and a recap cost estimate, not the cash balance a second time. Purchasing a restock pack is the cash debit. Round a recap cost only after aggregation; pack purchases, menu prices and payments remain integer minor units.

Commit a sale charge once when a delivered drink is accepted. Store its price snapshot; later menu/decor changes do not reprice the tab. No payment-card network or bank simulation.

Compute one tip at complete tab settlement from eligible accepted drink charges and a bounded tip rate. Paying twice does not create another tip. In this baseline quality affects accept/remake and recap; avoid layering undocumented quality, speed and decor tip multipliers.

At opening only, if no recipe can be made or affordably restocked after reusable tools/glasses are recovered, grant the configured starter recipe supply once for that shift. It cannot be resold. Practice has a separate inventory and cannot transfer anything into paid service.

## Saves and randomness
Version both save schema and content baseline. Persist committed event IDs, per-customer memory, order revisions, active attempts, per-shift recovery flag and random state. Never persist an active pointer hold; reopen paused.

Random guest/encounter/dice selection uses saved state so resume does not reroll it. Import checks structure, known IDs and units, nonnegative stock, valid money, and supported versions before replacing current state. Keep one last-good snapshot and an export option on failure.

## Navigation and asset fallback
Keep required interaction points reachable after furniture changes. Static NPCs do not become permanent path blockers. A blocked destination gets a visible error and a cancelled task, never an endless walk loop.

Returning a used glass creates a dirty glass at the sink. A single Wash action cleans one glass in the configured short animation; it uses neither repeated scrubbing nor a payment. Clean/dirty counts conserve. Later barback tasks may perform that same action.

A missing optional sound/decoration has a fallback. Missing required recipe/content/scene data is a clear load error; never invent replacement content. Low quality retains readable text, faces, shadows/grounding cues and essential feedback.

