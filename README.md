# Dive Bar  design workspace

Current state: researched plan and English content data. No playable game, package setup, runtime, build, deployment, or real-device performance results yet.

## Start here

- **[Development handoff — slice-0.1](docs/development-handoff.md)**: authoritative starting point, frozen first scope and M0–M5 implementation order.
- [Gameplay contracts](docs/gameplay-contracts.md): exact order, dialogue, scoring, closing, inventory and persistence behaviour.
- [Acceptance criteria](docs/acceptance.md): 27 observable scenarios to verify once code exists.
- [Technology and delivery](docs/technology-and-delivery.md): selected React/R3F/Vite/Tailwind stack, shadcn, tests, CI/CD and Dependabot.
- [Current game design](docs/game-design.md): revised loop, priorities, difficulty, scope and release gates.
- [Research review](docs/research-review.md): primary sources, observations, decisions and limitations.
- [Controls and art](docs/controls-and-art.md): mouse/touch/keyboard, screen layouts, palette and polish targets.
- [System diagrams](docs/system-design.md): screen flow, customer states, relationships and transaction rules.
- [Cocktail preparation](docs/cocktail-preparation.md): real recipe quantities, tools, mixing and scoring.
- [Source requirements](docs/requirements.md): all screenshot notes, uncertain drink names, revised dispositions.

## Content and tuning

- data/cocktails.en.json: three primary-source recipe seeds and nine ingredient types.
- data/dialogues.en.json: initial service/social dialogue bank.
- data/social-dialogues.en.json: additional social stories, regulars and one gated callback.
- data/balance.en.json: provisional modes, capacities, timings and comfort policies.
- data/vertical-slice.en.json: enabled/deferred content, canonical customers, predicates, stock, prices, tools, modifiers and scoring registry.
- data/toolchain.en.json: machine-readable planned stack, browser floor, tests and delivery policy.

The two dialogue banks total 24 encounters, 32 nodes and 96 responses. Eighteen are selected for the first slice and six are explicitly deferred. Structural checks and remaining implementation verification are recorded in docs/content-audit.md.

All player-facing text is English. Sweet-lie dialogue deliberately rewards customer expectations; there is no ingredient-provenance UI. Accurate measured cocktail preparation remains a separate core mechanic.

The next implementation gate is one complete recipe made and served on a real phone, followed by one coherent finished bar corner and a complete small shift. More content does not substitute for proving those interactions.
