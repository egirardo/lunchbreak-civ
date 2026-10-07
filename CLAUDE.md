# CLAUDE.md — Lunchbreak Civ

> All numbers are starting points for playtesting.

## Project Overview

**Lunchbreak Civ** is a turn-based 4X strategy game (explore, expand, exploit, exterminate) inspired by Civilization, designed to be **finished in ~20 minutes**. Everything about the design should serve that constraint: fast decisions, small scale, and a guaranteed ending.

### Design Pillars

1. **20 minutes, start to finish.** A full game is ~30 turns at ~40 seconds per turn. If a feature adds meaningful time per turn, it needs a strong justification or should be cut.
2. **Every turn matters.** No "end turn, end turn, end turn" filler. Each turn should offer at least one interesting decision.
3. **Readable at a glance.** The player should understand the game state in seconds, including after a pause (lunch gets interrupted).
4. **Always ends.** The game has a hard turn cap, so a session never drags on.
5. **Pausable and resumable.** Game state auto-saves every turn.

## Tech Stack

- Language/framework: TypeScript + Vite
- Rendering: DOM grid of pixel-art sprites (CSS `image-rendering: pixelated`). Chosen over Canvas so the map is screen-reader accessible.
- Art: pixel art. Prefer existing free-licensed asset packs (CC0 preferred; anything requiring attribution must be credited). If nothing suitable fits, generate simple generic sprites. Keep assets in `public/assets/` and record each source and license in `docs/credits.md`.
- Audio: sound effects and music generated with the Web Audio API, no external audio files
- State management approach: a single serializable game-state object plus pure update functions
- Testing: Vitest for game logic
- Persistence: localStorage for auto-save (no backend)

## Commands

```bash
npm install        # install dependencies
npm run dev        # start dev server
npm run build      # production build
npm run test       # run unit tests
npm run lint       # lint + typecheck
```

## Core Game Rules (Scaled-Down Civ)

Keep the rules in this section as the **source of truth**. If code and this section disagree, ask before changing either.

### Scale

| Parameter | Value | Notes |
|---|---|---|
| Map size | 16 × 12 tiles | Tune after playtesting |
| Tile grid | Square | Diagonals count as adjacent (8 neighbours) |
| Players | 1 human + 2 AI | |
| Turn limit | 30 | Hard cap; game ends after turn 30 |
| Target time per turn | ~40 seconds | |
| Starting units | 1 settler, 1 warrior | |

### Resources

Only **three** yields, to keep decisions quick:

- 🌾 **Food**: grows cities.
- ⚙️ **Production**: builds units and buildings.
- 🔬 **Science**: unlocks techs.

**Tile Yields (by terrain type):**
| Terrain | Food | Production | Science |
|---|---|---|---|
| Grassland | 1 | 0 | 0 |
| Forest | 1 | 1 | 0 |
| Hills | 0 | 2 | 0 |
| River (any tile) | +1 Food | — | — |
| Capital/city tile | — | 1 | 0 |
| Water | — | — | — |
| Mountains | — | — | — |

**Terrain movement:** Water and Mountains are impassable and produce nothing; they exist to shape the map. Every passable tile costs 1 movement.

**Base Science:** No terrain yields science. Instead, each city produces **1 Science + 1 per 2 population** (rounded down) every turn, before building bonuses.

**Resource Accumulation:**
- Cities sum the yields from all their worked tiles each turn and add bonuses from buildings.
- **Food**: Accumulates in the city. When it reaches **10 food**, 1 population is added and the pool resets to 0. (So ~2–3 turns per population with moderate food production.)
- **Production**: Accumulates in the city. When it reaches the cost of the building/unit, the item is built and the pool resets to 0. Overflow production carries over to the next item (e.g., if a Warrior costs 20 and you produce 25, the next item gets +5).
- **Science**: Accumulates globally for the player. When total science reaches the cost of the current tech, the tech is researched and the pool resets to 0.

**Building Bonuses:**
- **Library**: +1 Science per turn in city (+2 once Mathematics is researched)
- **Workshop**: +2 Production per turn in city
- **Granary**: +1 Food per turn in city
- **University**: +3 Science per turn in city (stacks with Library)
- **Walls**: no resource bonus (affects combat only)
- **Temple**: no resource bonus (affects score/culture only)

**Gold:**
Not implemented. Removed from the game per the design answers above.

### Cities

**Founding & Population:**
- Cities are founded by Settlers on any tile. The Settler is consumed.
- Cap at 4 cities per player (raised to 5 with Civil Service tech).
- Each city starts with 1 population.
- Population grows when the city accumulates 10 Food (see Resources section above).
- Max population per city: **6**. Once a city reaches 6 population, food accumulation still happens but produces no more population growth (becomes "food waste").

**Territory & Work Radius:**
- A city claims all tiles within **1 tile** of it (3×3 area). At **4 population** the radius grows to **2 tiles** (5×5 area).
- Claimed tiles are the player's territory (counts toward score). Each tile belongs to at most one city; overlapping tiles go to whichever city claimed them first.
- A city can only work tiles in its own territory. Water and Mountains can be claimed but yield nothing.

**City Tiles & Yields:**
- The city's own tile is always worked for free (its terrain yields + 1 Production) and does not use population.
- Each city automatically works the **best** tiles (those with highest total yields) up to its population cap.
- **Focus toggle** lets players override auto-selection:
  - **Food Focus**: prioritize food tiles
  - **Production Focus**: prioritize production tiles
  - **Science Focus**: no tiles yield science, so this instead gives the city +50% Science (rounded down) and works the best balanced tiles. Only available if the city has a Library.
- If a city has more population than available tiles, the excess workers idle (no penalty, just no extra yield).

**City Buildings:**
- Cities build one item at a time from the list below.
- Buildings persist in the city and provide bonuses forever.
- Buildings **cannot be destroyed** by war or other means. Once built, they stay.

**Building List & Costs:**
| Building | Unlocked By | Cost (Production) | Effect |
|---|---|---|---|
| Granary | Agriculture | 20 | +1 Food per turn in city |
| Workshop | Engineering | 25 | +2 Production in city |
| Walls | Bronze Working | 20 | +50% defense bonus when this city is attacked (see Combat) |
| Library | Writing | 25 | +1 Science per turn in city (+2 with Mathematics) |
| Temple | Philosophy | 30 | +2 Culture per turn and +2 score per turn. No happiness system. |
| University | Education | 40 | +3 Science per turn in city (stacks with Library) |

Each building can be built **once per city**.

**Tile Improvements (built by Workers, not cities):**
| Improvement | Unlocked By | Effect |
|---|---|---|
| Farm | Agriculture | +1 Food on the tile |
| Mine | Mining | +1 Production on the tile |

A Worker on a tile in its own territory spends 1 turn to build an improvement. One improvement per tile. Improvements cost no production.

**Upkeep:**
Buildings have **no upkeep cost**. Once built, they produce their bonus for free.

### Tech Tree

- 12 techs in 3 branches (Economy, Military, Science & Culture). Full list, costs, and prerequisites in `docs/techs.md`.
- Each tech takes roughly 2–4 turns to research.
- At game start, the player picks **one free tech** from the three tier-1 techs (Agriculture, Bronze Working, Writing). AI players pick one at random.
- The whole tree is visible from the start.

### Units & Combat

**Unit Types:**
- **Settler**: founds new cities (1 per city founded). Consumed when it founds. Moves 2 tiles/turn. Cost: 20 production. Building one does not reduce the city's population.
- **Warrior**: basic melee unit. Strength: 5. Moves 2 tiles/turn. Cost: 20 production. Upgrades to Swordsman with Iron Working.
- **Archer**: ranged unit (unlocked: Archery). Strength: 7. Ranged attack (2 tiles away). Moves 2 tiles/turn. Cost: 20 production. **Ranged attack rule**: Archer can attack a unit or city up to 2 tiles away without moving. If the ranged attack wins, the target is removed; if it loses, nothing happens and the Archer survives. When the Archer is itself attacked, it defends normally with strength 7.
- **Horseman**: fast melee unit (unlocked: Horseback Riding). Strength: 8. Moves 4 tiles/turn. Cost: 25 production.
- **Worker/Builder**: builds tile improvements (Farm, Mine). Does not attack. Moves 2 tiles/turn. Multiple can exist. Cost: 15 production. **Worker rules**: Cannot be attacked/captured. Builds one improvement per turn (select a tile, it takes 1 turn to complete).
- **Swordsman**: upgraded warrior (from Iron Working). Strength: 12. Moves 2 tiles/turn. Existing Warriors auto-upgrade, and the build menu's Warrior entry becomes Swordsman at the same 20 production cost.

**Combat:**
- One unit per tile, no stacking.
- Combat is **instant and one-round**: Attacker strength vs defender strength. Attacker wins if strength > defender strength; if tied, defender holds (attack fails). Loser is removed from the board. (Exception: a losing ranged attack just fails; see Archer.)
- **Flanking**: the attacker gets **+1 strength** if at least one other friendly unit is adjacent to the target. This breaks equal-strength stalemates (e.g. Warrior vs Warrior).
- No damage over time, no retreating. Combat is quick and decisive.
- No long combat animations.

**Cities in Combat:**
- A city defends with strength **5**, or with the strength of the unit garrisoned on it if that is higher.
- **Walls** multiply the city's defending strength by 1.5 (rounded down).
- If an attack on a city wins, any garrison is removed and the attacker moves in and **captures** the city. Captured cities (with their buildings) change owner.
- Any city can be captured. Capturing a player's **capital** eliminates that player: all their remaining cities and units are removed.

**Movement & Range:**
- Each unit has a movement allowance per turn (see unit types above).
- **Fog of war**: Units and cities see tiles within a **2-tile radius** (5×5 area). Enemies beyond that are hidden until spotted. Explored terrain stays revealed; enemy units are only shown while in sight.
- **Enemy territory**: Units can move freely into enemy territory (no walls or borders block movement). However, cities get a defense bonus against attacks.
- **Attack while moving**: Melee units must be adjacent to attack. Ranged units can attack from 2 tiles away without moving.

### Victory Conditions

The game ends at the turn limit (turn 30) or earlier if someone wins:

**Scoring (Default Victory):**
| Category | Points |
|---|---|
| Each city founded | 10 points |
| Each population | 1 point (counted at end of game) |
| Each tech researched | 5 points |
| Each tile in your territory | 1 point |
| Each Temple building | 2 points per turn (cumulative; e.g., 2 temples by turn 20 = 40 points) |
| Each University building | 3 points per turn (cumulative) |
| **Winning:** Highest score at end of turn 30. Ties go to the player with more techs, then more cities. |

**Domination Victory (Instant Win):**
- Capture all enemy capitals. **Capture** means: move a unit onto the enemy's capital tile. The capital is captured and the enemy is eliminated from the game. You win immediately.
- If you have more than 1 enemy, you must capture all of them.

**Science Victory (Instant Win):**
- Research all 12 techs in the tree. Instant win when you complete the last tech.
- (This is challenging in 30 turns and meant to be a high-risk, high-reward strategy.)

**Culture Victory (Instant Win):**
- Temples provide 2 Culture per turn (one Temple per city). Culture accumulates per player. Accumulate **20 Culture** to win instantly.
- (Meant to be a specialist win strategy: in simulations, a player rushing Writing → Mathematics → Philosophy and building Temples reaches 20 culture in ~88% of games, around turn 27–28; non-culture players never do. Lowered from 40, which was never reached.)

### AI Opponents

- AI turns must resolve in **under 1 second**.
- AI should be simple and predictable: expand, research, build military, attack the weakest neighbor.
- Difficulty levels Easy / Normal only.
  - **Normal**: standard rules.
  - **Easy**: AI production is reduced by 25% (rounded down), and the AI does not attack before turn 10.

## Architecture

```
src/
  core/        # pure game logic: no DOM, no rendering, fully testable
    state.ts       # GameState types
    rules.ts       # turn processing, combat, growth, research
    ai.ts          # AI decision-making
    map.ts         # map generation
  ui/          # rendering and input
  data/        # static definitions (units, techs, buildings) as data, not code
  storage/     # save/load
docs/
  techs.md
  balance.md
```

### Architectural Principles

- **Game logic is separate from UI.** Nothing in `core/` may import from `ui/`.
- **State is a plain serializable object.** This enables auto-save, undo, and easy testing.
- **Game content is data-driven.** Units, techs, and buildings live in `data/` as definitions so balancing doesn't require code changes.
- **Seeded randomness.** All randomness goes through a seeded RNG so games and bugs are reproducible.

## Code Conventions

- Language-specific style: strict TypeScript, no `any`.
- Prefer small, pure functions for game rules.
- Name things by game concept (`processTurn`, `foundCity`), not by implementation.
- Write unit tests for any new rule in `core/`.
- Comments explain *why*, not *what*.

## UX Guidelines

- The whole game should be playable with **one hand and a sandwich**: minimal clicks, big targets.
- Show a **turn counter and estimated time remaining** at all times.
- Auto-select the next unit that needs orders; auto-skip units with nothing to do.
- Provide an **"End Turn" shortcut** (e.g. `Enter` or `Space`).
- Tooltips over menus. No deep nested screens.
- Include a short "what happened while you were away" summary after resuming a saved game.

### Accessibility

- Don't rely on color alone to convey information (use icons/patterns too).
- Full keyboard navigation for all core actions.
- Sufficient color contrast and scalable text.
- Respect `prefers-reduced-motion`.
- Provide screen-reader-friendly labels for the main UI and turn summaries. The map should also be accessible and screen-reader-friendly.

## Scope Guardrails

This game is meant to stay small. When suggesting or implementing features, **push back on scope creep**:

- ❌ No diplomacy system, trade routes, religion, espionage, or great people (for now).
- ❌ No multiplayer (for now).
- ❌ No long-running animations or cutscenes.
- ✅ Prefer removing or simplifying a mechanic over adding a new one.
- ✅ If a feature would add more than ~5 seconds to an average turn, flag it.


## Balancing & Playtesting

### Why Playtesting Matters

**All the numbers above are educated guesses.** They need to be validated by actual play. A value that looks right on paper (e.g., "a Warrior costs 20 production") might feel wrong once you're playing:
- Too expensive → players never build units and military becomes irrelevant
- Too cheap → players spam units and run out of meaningful decisions
- Too slow to research → players get bored waiting
- Too fast → players never feel the impact of their tech choices

### What to Track During Playtests

**Metrics:**
- **Total playtime**: target 18–22 minutes. Log every playtest's finish time.
- **Turn timing**: how long does each turn take? Average per turn. If turns 1–10 feel slow and turns 20–30 feel rushed, that's a sign to adjust.
- **Tech research rate**: how many techs get researched? (target: 8–9 of 12). If only 4–5, costs are too high or base science is too low.
- **Units built per player**: how many Warriors, Archers, etc. get built? If few, costs or benefits might be off.
- **Number of cities**: do players hit the 4-city cap? If all three players end with <2 cities, expansion is too risky/expensive.
- **Population growth**: do cities grow? Are they bottlenecked on food?
- **Combat outcomes**: do wars feel balanced or one-sided? Do battles feel meaningful or trivial?

### What to Look For (Qualitative)

1. **Pacing**: Does the game feel like it's building toward something, or does it feel flat throughout?
2. **Meaningful decisions**: Each turn, do players have 2+ interesting choices? Or do they feel forced (only viable move obvious)?
3. **Catch-up mechanics**: If one player gets ahead, can others catch up through smart play, or is it a runaway leader?
4. **Endings**: Do games end decisively or on a tiebreaker? Do you *want* to see the final turn or are you already done?

### How to Iterate

**When you notice a problem:**

1. **Identify the symptom**, e.g., "games ran 28 minutes; players got tired at turn 25"
2. **Hypothesize a cause**, e.g., "early expansions take too long; players spend 3+ turns just moving settlers"
3. **Make one change**, e.g., "settlers move 3 tiles/turn instead of 2"
4. **Playtest again** and measure
5. **Record the change** in `docs/balance.md` with the before/after metrics

**Adjust these values first if the game feels off:**
- **Too long**: reduce turn limit (30→25), reduce map size (16×12→14×10), or reduce starting resources
- **Too short/boring**: increase turn limit or raise base science output
- **Unbalanced military**: adjust unit costs or combat strength values
- **Slow expansion**: reduce settler cost or increase settler move speed
- **Tech research stuck**: reduce tech costs or increase base science

### Documentation

- Log turn-by-turn timing and final time in playtest notes (`docs/balance.md`, created when playtesting starts).
- Record each balance change with a reason and the playtests that motivated it.
- Include post-playtest notes: "felt good", "felt too slow", "military was OP", etc.
- Every balance change should be **traceable back to a playtest observation**.

## How Claude Should Work on This Project

- Use the Opus model !important
- Read this file and `docs/` before starting significant work.
- Keep changes small and focused; explain trade-offs briefly.
- Propose a short plan before large refactors or new systems.
- Run tests and lint before calling a task done.
- When a request conflicts with the design pillars (especially the 20-minute constraint), say so and suggest an alternative.
- Don't invent game rules: if something isn't specified in **Core Game Rules**, ask or propose it clearly as a suggestion.

## Open Questions

- Art style (pixel art, flat vector, minimal/abstract?)
- Sound and music?
- Single-player only, or hot-seat later?
- Name the civilizations and leaders (or keep them generic?)

## Answers to Open Questions
- Art style: pixel art, using existing free-licensed assets where possible, otherwise generated generic sprites (see Tech Stack)
- There should be sound and music, generated with the Web Audio API
- Single-player only
- Keep generic names