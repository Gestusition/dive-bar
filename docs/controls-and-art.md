# Controls, screen layouts, and visual direction

Revision: 24 October 2026. Design targets, not implemented UI.

## One complete control scheme
Mouse, touch, and keyboard dispatch the same action names. Pointer support alone does not guarantee a good mobile experience; touch layout and cancellation must be tested separately.

| Intent | Mouse | Touch | Keyboard alternative |
| --- | --- | --- | --- |
| Move and interact | Click guest/station | Tap guest/station | Cycle target, confirm |
| Queue one extra task | Explicit Queue control | Explicit Queue control | Remappable queue key |
| Cancel pending action | Task-rail cancel | Task-rail cancel | Cancel key |
| Select ticket/bottle/tool | Click | Tap | Focus navigation + confirm |
| Standard measure | Select mark, confirm pour, transfer | Same large stationary controls | Same focused controls |
| Free Pour | Hold/release or toggle | Hold/release or toggle | Remappable hold/toggle |
| Stir/shake | Start action | Start action | Confirm |
| Wipe | Short stroke or one tap action | Short swipe or one tap action | Confirm |
| Settle ordinary tab | Settle action | Settle action | Confirm |
| Open/close focus panel | Visible button | Visible button | Remappable back/pause |

Keyboard bindings are a future implementation contract, not existing shortcuts. No essential action requires hover, right click, a long press, a swipe, phone tilt, or simultaneous gestures.

## Input behaviour
- Highlight target and show a verb before execution: Seat, Take Order, Serve, Wipe, Pay.
- Raycast to enlarged non-overlapping interaction proxies. If guests overlap, open a small named target choice rather than guessing.
- On pointerdown start only the intended gesture. Capture the pointer for a held pour.
- Release, pointercancel, lostpointercapture, window blur, visibility loss, opening a panel, and context loss terminate the hold. Pointerleave alone does not strand a captured gesture.
- A full vessel clamps the added volume; excess is explicitly spilled or the pour stops according to assistance. No hidden negative volume.
- Only the initiating pointer may control a held action. Ignore a second finger until completion.
- Tap-to-toggle pours stop on the same cancellation events; resume never restarts them.
- Scope touch-action suppression to interactive game surfaces. Allow scroll within menus and don't disable browser zoom globally.
- Protect payment, discard, and story choices from duplicate activation. Confirm wasteful full-vessel discard; do not confirm every tiny action.
- Input feedback target: visible acknowledgement within 100 ms on the tested phone. UI panels target 150–250 ms transitions, without delaying the action handler. These are targets, not measured claims.
- Clear input when a control becomes disabled, its panel closes, or an interrupted app returns.

## Overview layout
Desktop/landscape uses a stable elevated camera:
- Top-left: shift time and pause.
- Top-middle: compact ticket tabs, guest name/seat and drink icon. House Shift supports three work slots; the same rail must fit four for Rush and include pending first-drink reservations.
- Floor: entrance on one side, two tables, counter seats; guest state icons above heads.
- Back wall: ingredient shelves and a readable preparation station.
- Bottom: current contextual action and two-slot action queue.
- Money/upgrade details belong in the recap, not a permanent statistics dashboard.

Portrait uses a closer pan between two named zones, Floor and Counter, with a fixed ticket strip and bottom action dock. It is not a shrunken desktop scene. Switching zones preserves all state and selected order. Landscape is recommended, never a hard lock.

## Workstation layout
Pinned ticket and collapsible recipe at top. Selected vessel stays central. Bottles sit on a short category shelf with readable names and distinct silhouettes. Amount controls and Transfer are near the bottom, above safe-area padding.

Do not require finding a tiny lime in the 3D scene to add lime juice. A labelled ingredient choice selects the corresponding physical bottle. Player decisions stay about ingredients and quantity.

Target coarse-pointer controls of at least 48 CSS px with roughly 8 px between adjacent actions. Primary text starts around 16 CSS px and can scale. Verify at 360×640 and narrow 320 px width; essential controls must reflow without clipping. A short phone keyboard must not obscure POS confirmation.

## Recipe and dialogue panels
Implement the DOM panels in React, use Tailwind v4 for layout/theme and selected shadcn primitives for focus and inputs. Apply the game's own warm palette and touch sizing. The voxel materials are handled by Three.js; CSS classes do not style the 3D meshes. Framework choice does not by itself validate accessibility or FPS.

Recipe book shows source quantity, method, glass, ice, garnish, and the current accepted modifier. No ingredient sourcing information.

Dialogue shows name, expression, line, three or occasionally four full-width responses. A response opens a short reaction before Continue. Never label a choice as a correct answer or a lie. No decorative animation delays reading; typewriter effect can be disabled or skipped.

Detailed POS focuses on one tab: item list, total, split controls, payment and Back. No fake bank network or real financial integration. Simple settlement stays a fast overview action.

## Visual brief
A cute little bar with lived-in details. Warm lower lighting, soft shadows, plants, a jukebox, coasters, mismatched but coordinated stools, and little signs. Keep functional props visually distinct from decoration.

Suggested palette, an art proposal:
| Role | Colour |
| --- | --- |
| Dark room/background | #241D2B |
| Walnut structure | #704738 |
| Lit amber wood | #C58C58 |
| Cream label/UI paper | #F5E6C8 |
| Cherry accent | #C94C68 |
| Muted bottle green | #568277 |
| Restrained neon teal | #79D5BD |

Do not put low-contrast text directly on neon or wood grain. Menu panels use opaque readable surfaces.

Characters: large readable heads, compact bodies, distinct hair/jacket silhouettes, expressive eyes and brows. Use one voxel unit scale; hands, glasses, and bottles must fit that scale. Aim at one shared modest rig with individual silhouettes rather than one giant cube per body part.

Animation set for proof: idle, walk, carry, serve, approve, skeptical, disappointed. Secondary ear/head/body motion is small and interruptible. Use a quick settle/overshoot on placement; respect reduced motion. No requirement for a full lip-sync or facial physics pipeline.

At overview distance, faces and drink silhouettes must read without zoom. Ticket and guest state uses shape/text as well as colour. Unready guests display Menu; ready guests display Order. Reserved items show a target guest badge.

## Production pipeline
Author voxel assets in a voxel editor; clean/consolidate geometry and rig in a DCC tool; export runtime assets as GLB. Confirm exporter/material behaviour on one prop before building the catalogue. Keep final source assets separate from runtime exports.

Remove internal faces. Reuse a small palette/material set and instance bottles/props where appropriate. Voxel appearance does not require destructible terrain or thousands of independent cubes.

Prototype asset packs can prove scale, but final art must share palette, voxel density, materials, and lighting. No claim that a stock pack alone meets the reference's polish.

## Rendering targets
Current Three.js WebGLRenderer needs WebGL 2; show a readable compatibility screen before heavy loading if unavailable.

Initial budgets to profile, not guarantees:
- 60 FPS target desktop, stable 30 FPS target on a named mid-range phone.
- Approximately 150 draw calls and 150k visible triangles as an initial low-quality scene ceiling.
- One shadow-casting key light maximum on higher quality; blob/baked shadow fallback on low.
- Clamp render resolution separately from CSS size; test pixel ratio around 1–1.5 on phone.
- Keep opening interactive download under about 12 MB compressed; defer additional decor/audio.
- Bloom and decorative particles optional; gameplay reads with them disabled.
- Profile a ten-minute warm device run, not a single cool-device screenshot.

## Audio and feel
Five distinct feedback families: measure, mix, serve, social reaction, and payment. Important information always has a visual equivalent. Mute sliders separate music, ambience, and effects. Unlock audio from a user Start/Resume gesture and tolerate denied audio.

A glass landing, small foam/splash animation, ice clink, and customer expression provide reward. Keep camera still for routine tasks. Ambient stools and lights animate sparingly, not constant screen-wide motion.

## Real-device gate
Test desktop mouse and keyboard, Android Chrome touch, and iPhone Safari touch. Name the actual tested devices/versions in the future QA report. Exercise rotation, safe areas, zoom/UI scale, accidental second finger, drag outside canvas, incoming call/tab switch, audio resume, save failure, and WebGL context loss. Browser emulation supplements but cannot replace this gate.

