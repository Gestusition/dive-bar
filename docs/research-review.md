# Research review — 24 October 2026

Status: research and planning, no playable build. The reference review used the official Check Please description and three official screenshots inspected in this chat; its demo was not played. Proposed changes below are our design judgments.

## Findings and decisions
| Primary source | Observation | Design decision for this game |
| --- | --- | --- |
| [Check Please](https://store.steampowered.com/app/5011450/Check_Please/?curator_clanid=39992117) | Published service loop includes seating, orders, serving, cleaning, and improvement. Screenshots show illustrated 2D art and an elevated overview. | Preserve readability and service rhythm; adapt into a coherent voxel dive bar. |
| [PlateUp](https://store.steampowered.com/app/1599600/PlateUp/) | Appliance arrangement and automation develop between shifts. | Upgrades should relieve visible bottlenecks; layout and barback priorities matter. |
| [VA-11 Hall-A](https://store.steampowered.com/app/447530/VA11_HallA_Cyberpunk_Bartender_Action/) | Drinks and customer tastes affect its story. | Connect mixing, regulars, and dialogue callbacks. |
| [Team17: Overcooked AYCE](https://www.team17.com/news/overcooked-all-you-can-eat-out-now-on-all-platforms) | Assist options include more time and optional order expiration; UI scaling is described. | Separate assistance from content progression. |
| [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/) | Recommends simple controls, spaced touch targets, alternatives to held/repeated input, practice, and self-paced reading. | Single-pointer complete controls, tap alternatives, no mandatory motion gestures or dialogue countdown. |
| [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) | Shared mouse/touch/pen events and pointer capture. | Shared action layer; terminate pouring on release, cancel, and lost capture. |
| [MDN Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API) | visibilitychange reports document visibility. | Pause and clear input when hidden; require Resume after interruption. |
| [MDN autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay) | Audible autoplay can be restricted. | Start/Resume unlocks sound; silence never blocks gameplay. |
| [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) | Local structured storage and transactions. | Versioned local saves, visible save errors, import/export; no account requirement. |
| [Three.js voxel geometry](https://threejs.org/manual/pages/voxel-geometry.html) | Per-voxel meshes and internal faces waste resources. | Consolidate visible geometry and instance repeated props. |
| [Three.js renderer](https://threejs.org/docs/pages/WebGLRenderer.html) | Current WebGLRenderer requires WebGL 2. | Detect support; validate named real devices rather than promising every phone. |
| [Vite Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages) | Repository base paths and Actions builds are supported. | Base-aware static assets and an Actions deployment after a game exists. |
| [Kenney Food Kit](https://kenney.nl/assets/food-kit) | CC0 3D food props are available. | Optional prototype assets; final scale, silhouettes, and materials still need unification. |

## Main review
The strongest identity is **real measured drinks + reading people + a bar that becomes yours**. Payments, cleanup, food, and comedy should support this rather than compete as equally deep games.

The previous plan risked slow measuring on phones, excessive modal interruptions, a repetitive closing checklist, mostly service-oriented dialogue, and no workload model. The revision addresses each.

| Previous assumption | Revision |
| --- | --- |
| Hold precisely for every measure | Marked measuring by default, optional Free Pour |
| Many equal-depth stations | Deep mixing and social play; lightweight supporting stations |
| Full payment sequence every time | Fast ordinary settlement; detailed POS for splits/corrections |
| Every item bought manually nightly | Editable Restock to Par proposal |
| Random stool accidents mid-rush | Rare authored comedy in a safe moment |
| Dice competes with active service | Optional after-hours House Dice |
| Huge menu from day one | Select 3–6 active recipes between shifts |
| Difficulty by more tasks and tighter precision | Independent workload and dexterity controls |
| One-off dialogue popups | Returning regulars, short stories, and callbacks |
| All screenshot ideas are mandatory at equal priority | Preserve source ledger; stage, simplify, or move features explicitly |

## Risks and evidence limits
- Mixing must pass a real-phone control proof before more guests are added.
- Ask playtesters why a social answer worked; repair arbitrary writing rather than adding provenance evidence.
- Validate one finished corner and one animated regular before multiplying props.
- Measure active work per group against arrival interval; seating capacity alone is not balance.
- Validate save interruption, touch cancellation, and resumed pouring before a Pages release.
- All timing, quality, asset, and performance numbers in the revision are provisional acceptance targets.
- No FPS, load time, fun, retention, or player-satisfaction outcome has been measured.
- No third-party game assets or Kenney assets were downloaded during this review.
- The three sourced seed recipes remain unchanged. Ambiguous screenshot drink names remain unresolved.

