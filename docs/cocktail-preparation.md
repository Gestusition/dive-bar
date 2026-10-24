# Cocktail preparation system

Status: design and verified recipe seed; runtime and playtesting pending.

Revision 24 October 2026: docs/game-design.md and docs/controls-and-art.md define the current screen, timing, and input policy. Marked measuring is the default; Free Pour is optional. Both preserve real ingredient amounts and active preparation.

Final implementation authority: docs/development-handoff.md and docs/gameplay-contracts.md. The slice's tools, calibrations, scoring and stock registry is data/vertical-slice.en.json.

## Real recipes, interactive preparation
Use real drink categories and ingredients in measured quantities. A player physically selects tools, measures ingredients, transfers them, mixes with the required method, strains when needed, and serves with the appropriate ice, glass, and garnish. Do not implement a single automatic Make Cocktail button as the core interaction.

The initial recipe seed in data/cocktails.en.json covers three distinct techniques:
- Old Fashioned: 45 ml bourbon or rye, one sugar cube, a few dashes each of Angostura bitters and water; dissolve sugar, build over ice, and stir gently. Orange slice or zest and cocktail cherry.
- Margarita: 50 ml 100% agave tequila, 20 ml triple sec, 15 ml fresh lime juice; shake with ice and strain into a chilled cocktail glass. A half salt rim is optional.
- Manhattan: 50 ml rye whiskey, 20 ml sweet red vermouth, one dash Angostura bitters; stir with ice, strain into a chilled cocktail glass, and add a cocktail cherry.

Sources, checked during this work:
- https://iba-world.com/iba-cocktail/old-fashioned/
- https://iba-world.com/iba-cocktail/margarita/
- https://iba-world.com/iba-cocktail/manhattan/

The Old Fashioned source says "few dashes" without an exact count. A two-to-three-dash game target is explicitly an adaptation. None of these sources specify a universal shake/stir duration or game tolerance. Do not present game tuning as a sourced bartending rule.

## Station layout and input
The service overview keeps the whole bar readable. Selecting the preparation station opens a closer workstation view with the order ticket, an English recipe book, bottles, a graduated jigger, shaker, mixing glass, serving glasses, ice, spoon, muddler, garnish, and a waste sink.

Default on both desktop and phone: select the ingredient, choose a measuring mark, start a short visible measured pour, and transfer the portion. The player must choose the amount; the recipe does not automatically choose it. Offer 5 ml marks and optional 1 ml adjustment. Wrong ingredients or amounts remain possible.

Optional Free Pour on desktop: select a bottle, hold to dispense, release to stop, then transfer. On phone use a large stationary hold control or tap-to-toggle equivalent. Do not require device tilt, tiny bottle hit targets, or precise dragging. Release/cancel, lost capture, interruption, and panel transitions clear the active pour.

A 25/50 ml two-sided jigger with readable graduations supports the initial measures; it must be empty before flipping sides. The UI can show a numeric amount while retaining the physical fill animation. Dash bottles dispense one dash per deliberate press; sugar cubes begin as discrete items. Keep recipe quantities in native units. Capacity calculations may use the profile's explicit per-product game calibrations; these are not universal dash measurements.

Marked measuring stops at the amount the player deliberately selected, not at the recipe's hidden correct target. Free Pour has no recipe-target stop by default. Guided practice may highlight the recipe amount and explain assistance. Assistance is available independently of progression and service difficulty.

## Mixture state
Track ingredient identity and native quantity inside every vessel, plus calibrated capacity, ice, dissolved sugar, chilling flag, mixing action, garnish, and preparation history. Transfer dissolved components proportionally, including calibrated dash liquids and dissolved sugar equivalents. Prevent creating, deleting, or selectively removing ingredients through transfers. Account for spill and remaining liquid explicitly. Tare the measuring UI without erasing contents.

Use an event ledger for pours, transfers, shaking, stirring, straining, spills, discards, garnish, and service. Quantities consumed from bottles are deducted once; remakes do not restore used stock. Leaving the panel or a paused conversation must not duplicate an ingredient transfer.

Use one canonical preparation state for visuals, recipe evaluation, and inventory. Bottle labels, fill levels, glass colour, and the final score must reflect that state.

## Preparation rules
Represent recipes as required ingredients and ordered technique constraints, rather than demanding an arbitrary order for every ingredient. Margarita and Manhattan ingredient additions may be reordered before mixing. Old Fashioned requires dissolving the sugar before building the drink over ice.

Track shaking and stirring as different actions. Wrong technique affects quality. Serving ice and mixing ice are distinct; strained drinks do not retain mixing cubes by default. Use fill geometry, pour streams, splashes, ice props and explicit chilled flags. Continuous melting, dilution and freshness penalties are deferred from the slice.

Timing thresholds and dilution behaviour are game approximations until calibrated. Do not invent exact universal shake or stir seconds and attribute them to IBA.

## Amounts, ratio, and quality
Evaluate both the portion size and the component ratios. A 100/40/30 ml Margarita has the correct ratio but is twice the intended serving. A half-sized serving, extra water, or a missing ingredient must also lose points.

Initial quality weights, subject to playtesting:
| Dimension | Weight |
| --- | --- |
| Correct ingredients | 30 |
| Individual measured quantities | 20 |
| Proportions and serving yield | 15 |
| Preparation method | 15 |
| Ice and chilling | 10 |
| Glassware | 5 |
| Garnish | 5 |

For numeric ml ingredients, initial full-credit tolerances are max(2 ml, 10% of target) in assisted practice, max(1 ml, 5%) in standard play, and max(1 ml, 3%) in expert play. These are game design values. Score outside the tolerance continuously, without a one-drop cliff. Keep source quantities unchanged across difficulty modes.

Discrete sugar and dash targets use their own rules. Optional garnish earns full credit when omitted unless the accepted order explicitly requests it. An omitted optional salt rim must not become a hidden penalty.

Use the resolved scoring algorithm in docs/gameplay-contracts.md and profile weights/tolerances. Both 2 and 3 dashes in an accepted Old Fashioned range receive full quantity credit without hidden ratio penalties. A single-order yield outside 65–135% is invalid, and wrong primary technique cannot score Good.

Wrong or missing base spirit, or a forbidden ingredient from an accepted order restriction, is an invalid order even if presentation is perfect. Smaller quantity and technique mistakes reduce quality progressively. Early guided practice permits a retry without a punitive service collapse.

Customer modifiers create an explicit target variant only after acceptance. A less-sweet request changes the relevant quantity; the base source recipe remains preserved. Preserve the latest confirmed order across a conversation. An ingredient-origin story changes perceived experience, never the actual cocktail target or measured contents.

## Service pressure and all other features
Guided practice pauses customer service. In normal preparation, the bar continues running: queue, menu reading, customer patience, food, POS, and cleaning all compete for attention. Keep a compact status strip visible and allow the player to return to the overview with the unfinished mixture intact.

Use initial targets of roughly 15–25 seconds of active input for a familiar simple drink as a hypothesis, not a validated measurement. Workload must also include walking, menus, serving, POS, and extra guests in a group. data/balance.en.json uses a provisional 39 seconds active work per group and a 58-second mean arrival gap for House Shift. First tune recipe actions, then arrival spacing and patience using real phone measurements. Avoid simultaneously increasing volume, recipe complexity, and measuring precision.

A player-triggered dialogue, recipe-book reading, detailed POS, or pause screen stops the simulation under the master time policy. Ordinary quick settlement does not. Resume without accumulating pour volume or prep progress during the pause. Selected service speed scales customer timers, not the responsiveness of physical measuring controls.

Barback upgrades can replenish ice and bottles, stage clean glassware, or clear waste. Keep ingredient choice and preparation under player control unless an explicit later automation upgrade is designed. Customization, stock placement, and equipment capacity can affect workflow while preserving touch accessibility.

## Scope and acceptance
The full screenshot scope is tracked in docs/requirements.md. Three seed recipes are a first implementation set, not the final menu.

Before shipping: verify recipe references and accepted variants, quantity conservation, wrong-bottle handling, flexible ingredient order, required technique sequence, omitted optional garnish, stock deductions, vessel overflow, discard/remake costs, pointer release/cancel, panel close, pause/resume, and interrupted mobile input.

Actual recipe scoring, recipe-book UI, animations, stock integration, and performance testing are not implemented yet.

