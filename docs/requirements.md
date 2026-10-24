# Requirements ledger

> Historical planning baseline. A playable runtime now exists; see [implementation-status.md](implementation-status.md) for actual scope and validation limits.


Status: source coverage of the supplied screenshot and chat requests. Revised on 24 October 2026 under the user's permission to add, remove, or change mechanics. docs/game-design.md is the current design authority. Original wording stays here even when a mechanic is simplified or moved. No listed gameplay feature is implemented yet.

## Product constraints
- English player-facing game.
- Voxel dive bar with a coherent finished visual standard.
- Confirmed visual/composition and service reference: Check Please!, Steam app 5011450.
- Browser play on both phones and computers.
- Static deployment to GitHub Pages.
- Real ingredient identities, measured quantities, appropriate methods, glassware, ice, and garnish.
- Branching English customer dialogue built around sweet lies, believable stories, and customer expectations; no player-facing provenance information.
- Difficulty must be balanced across service, manual preparation, dialogue, and upkeep.

## Screenshot drink notes: preserve before interpretation
The first message reads:
> macoow new  cherry meal cherry lemonade voda vişne suyu vişne vodkaası limonata rase marry blody mary
> wisconsin old fashion ilony old fashion margarita deaiy curry  summer hummer  rom runner

Later messages read:
> long eaye
> manhattan
> dal bar
> dive bar

Spacing separates some items, but does not unambiguously identify every drink. Preserve the original wording and validate names before enabling recipes.

| Screenshot wording | Working interpretation | Status |
| --- | --- | --- |
| macoow new | Possibly Moscow Mule | Name not confirmed; no recipe enabled |
| cherry meal | Possibly Cherry Mule | Name not confirmed; no recipe enabled |
| cherry lemonade | Cherry Lemonade | Variant and alcohol content unspecified |
| voda vişne suyu vişne vodkaası limonata | Possible cherry/vodka/lemonade ingredient notes or more than one drink | Segmentation and quantities unresolved |
| rase marry | Possibly a rosemary-related drink or ingredient | Unresolved |
| blody mary | Likely Bloody Mary | Needs recipe verification before enabling |
| wisconsin old fashion | Wisconsin Old Fashioned | Regional variant; must remain separate from the IBA whiskey Old Fashioned |
| ilony old fashion | Possible additional Old Fashioned variant | Unresolved; do not silently merge |
| margarita | Margarita | IBA seed recipe verified |
| deaiy curry | Possibly Daiquiri | Name not confirmed; no recipe enabled |
| summer hummer | Summer Hummer | Needs variant/source confirmation |
| rom runner | Likely Rum Runner | Needs variant/source confirmation |
| long eaye | Possibly Long Island Iced Tea | Name not confirmed; no recipe enabled |
| manhattan | Manhattan | IBA seed recipe verified |
| dal bar | Unresolved wording, possibly a venue/theme note | Retain; do not invent a cocktail |
| dive bar | Dive bar setting | Confirmed by the user's written request |

An IBA Old Fashioned is also included as a technique seed. It does not satisfy the distinct Wisconsin variant or resolve "ilony old fashion".

## Screenshot coverage and original interpretations
| Screenshot item | Intended mechanic | Integration and acceptance |
| --- | --- | --- |
| Bar reg'ları | Bar regulars; wording may also mean bar rules | Include recurring named customers, usual drinks, remembered preferences, habitual seats, and relationship-specific banter/stories. Keep the earlier house-rule design as well; do not silently assume that "reg" only means regulation. Exact wording remains open. |
| Bar dice | Optional dice minigame | Opens at a suitable table/bar spot; clear turn, stakes, and result flow. Exact dice variant and economy are unresolved; no unrequested real-money system. |
| Tezgah silme | Wipe the counter | Spills create visible dirty patches; clean them through a short interaction. Dirt affects available workspace or customer experience. |
| Sandalyeden emelik / falling from chairs | Chair/stool physical comedy | Treat the chair note as a provisional falling/slipping event interpretation. Show a short readable animation and aftermath; tune frequency to avoid constant interruption. Original wording is ambiguous. |
| Food order ısıtma/serv etme | Food orders, warming, serving | Ticket and food item enter a warming station; track readiness and waiting quality, then serve to the correct customer. Do not expand this note into a full cooking simulator by default. |
| POS detaylı kullanım arayüzü | Detailed POS interface | Open tabs, select table/customer, record items and modifiers, check total, split bills, take payment, and close the tab. Prevent duplicate payment and preserve unpaid tabs. |
| Mesai sonu restock yapmak/buz koymak | End-of-shift replenishment | Review actual usage and money, replenish bottles/garnish and ice capacity, prepare for the next shift. Used/discarded amounts count toward stock. |
| Çöp çıkarmak | Take out the trash | Prep and service generate waste; bags have capacity, removal takes time, and the close checklist tracks completion. |
| Bar customization sekmesi | Customization tab | Dedicated screen for available decor, colours, signage, furniture, and equipment placement. Preserve accessibility and usable navigation paths. Cosmetic and functional prices/effects are separate. |
| Menü ver ne order almayı bekleme işi | Hand over menu, wait, take order | Explicit seated, menu-reading, ready-to-order, and ordering states. The player can do other work while a guest reads. |
| check please | Reference quality and service feel | Elevated overview, expressive characters, queue, visible order requests, and polished feedback; translated into a coherent voxel production. |
| Barback ekle bide upgrade olarak | Barback upgrade | Hire/unlock a support worker for explicitly assigned ice/stock/glassware/waste tasks. Define task priority, travel, capacity, and cost; verify that it actually reduces workload. |

## Later conversation requirements
| Item | Intended behaviour |
| --- | --- |
| Customer questions and branching dialogue | Multiple English responses, occasional follow-ups, customer-specific reactions, persistent rapport and remembered preferences |
| Sweet lies | Truth can lose a sale; a plausible charming fiction can secure it; extravagant stories can be challenged |
| No origin information | No sourcing panel, supplier note, delivery record, or origin codex; recipe quantities and ingredient labels remain readable |
| Real mixing | Choose actual ingredient types and measured quantities, use the required tools and method, then evaluate the finished drink |
| Correct proportions | Evaluate quantities, ratios, yield, substitutions, and extra ingredients; no perfect score just for scaling every amount equally |
| Difficulty balance | Reading pauses dialogue time; preparation and service create active pressure; tune workload and precision independently; reduce pressure after repeated failure |
| Broad realistic dialogue | The revised banks contain 24 encounters, 32 nodes and 96 responses. This remains a seed; expand and edit social stories, service conversations, regulars and contextual variants. |

## Integrated shift
Opening: inspect station, stock, ice, clean glasses, rules, and any upgrade assignments. Returning regulars keep their preferences and relationship history across shifts.
Service: seat guests, give menus, wait for readiness, take orders and dialogue, prepare measured cocktails and warmed food, serve, settle POS tabs, and clear/clean.
Side activity: dice and occasional authored chair events at controlled frequency.
Closing: settle outstanding tabs, clear glasses, wipe, empty trash, replenish ingredients/ice, review earnings, and choose upgrades or decor.

Order identity, stock consumption, payment, guest state, and staff tasks must share consistent state across all screens. An unfinished drink survives returning to the overview; a cancelled order releases its reservation without restoring already consumed stock.

## Delivery stages
1. Prove shared mouse/touch control and one real recipe, then approve a coherent visual target scene.
2. Complete a small playable shift: three recipe seeds, menu-reading, ordinary POS, cleaning, sweet-lie dialogue, save/resume.
3. Calibrate arrivals against actual preparation times; add regular memory, detailed POS, two warmed snacks, closing and barback.
4. Expand the verified menu and dialogue; add optional dice, scripted stool comedy and decor; verify device performance and Pages delivery.

## Research revision disposition
| Source feature | Decision | When and why |
| --- | --- | --- |
| Drink list | Retain as a catalogue backlog, activate only 3–6 recipes per night | Controls recipe learning and stock complexity; ambiguous names remain unresolved |
| Regulars and house rules | Retain | Personalities, usual orders and stories are central; concise rules support understandable service |
| Bar dice | Move outside active service | Optional House Dice uses cosmetic tokens and never gates essential upgrades |
| Wiping | Simplify input | Short action or swipe alternative; no repeated scrubbing |
| Chair incident | Reduce to a rare authored vignette | Keep the joke without random control loss or unavoidable service failure |
| Food | Stage after the core slice | Two warmed snacks and one station; no full cooking tree |
| Detailed POS | Contextual depth | Fast normal settlement; details for splits and corrections |
| Restock and ice | Keep, reduce administration | Editable Restock to Par, visible stock, barback assistance |
| Trash | Keep within a short close and helper tasks | No mandatory repeated bag runs during every rush |
| Customization | Keep between shifts | Cosmetic expression and a few validated equipment/layout choices |
| Menu reading | Keep in the first complete shift | Provides a clear customer state and a natural work interval |
| Reference quality | Keep as an art and interaction quality target | Voxel adaptation with its own coherent assets; no claim of already matching quality |
| Barback | Keep as a useful upgrade | Relieves an identified bottle/ice/glass/waste bottleneck; does not auto-craft drinks |
| English sweet-lie dialogue | Expand | Separate service and social banks; regular stories and gated callbacks |
| Real measured mixing | Keep as a core skill | Marked measuring by default, optional Free Pour; same recipes and scoring |

This is a deliberate revised feature set under the user's authorization, not a claim that every initial mechanic will ship unchanged. See docs/research-review.md for evidence and tradeoffs.


