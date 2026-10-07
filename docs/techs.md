# Tech Tree — Lunchbreak Civ

> Draft. Place at `docs/techs.md`. Items marked `TODO` are for you to decide. All numbers are starting points for playtesting.

## Quick Primer: How Tech Trees Work in Civ

- **Techs unlock things.** Researching a tech gives you access to new units, buildings, or bonuses. Nothing is available until you've researched the tech that unlocks it.
- **Techs have prerequisites.** Advanced techs require earlier ones. This creates a tree shape and forces the player to choose a direction.
- **Science is the currency.** Cities produce science points each turn. Those points go into the tech currently being researched. When the cost is reached, the tech is unlocked.
- **You research one tech at a time.** The player picks what to research next. This is one of the main decisions each turn.
- **You can't get everything.** In this game, the tree is deliberately bigger than what a player can finish in 30 turns, so every choice means giving something up.

## Design Rules for This Tree

1. **12 techs total**, in 3 branches of 4: Economy, Military, Science & Culture.
2. **4 tiers.** Each tier costs more than the last.
3. **Every tech unlocks something tangible** (a unit, building, or clear bonus). No "+1% something" filler techs.
4. **Research a tech in roughly 2–4 turns** at typical science output.
5. **Total cost exceeds what a player can afford.** See "Balance Targets" below.
6. **Keep it easy to read.** The player should understand the whole tree in under 30 seconds.

## The Tree at a Glance

```
ECONOMY                  MILITARY                   SCIENCE & CULTURE
(Tier 1) Agriculture     (Tier 1) Bronze Working    (Tier 1) Writing
   │                        │                          │
(Tier 2) Mining          (Tier 2) Archery           (Tier 2) Mathematics
   │                        │                          │
(Tier 3) Engineering     (Tier 3) Horseback Riding  (Tier 3) Philosophy
   │                        │                          │
(Tier 4) Civil Service   (Tier 4) Iron Working      (Tier 4) Education
```

Cross-branch links:

- **Iron Working** also requires **Mining**
- **Civil Service** also requires **Writing**
- **Education** also requires **Engineering**

## Tech Reference

| # | Tech | Branch | Tier | Cost | Requires | Unlocks |
|---|------|--------|------|------|----------|---------|
| 1 | Agriculture | Economy | 1 | 10 | none | **Farm** tile improvement (+1 food), **Granary** (faster city growth) |
| 2 | Mining | Economy | 2 | 20 | Agriculture | **Mine** tile improvement (+1 production) |
| 3 | Engineering | Economy | 3 | 30 | Mining | **Workshop** building (+production in city) |
| 4 | Civil Service | Economy | 4 | 40 | Engineering, Writing | +1 city limit (5 instead of 4) |
| 5 | Bronze Working | Military | 1 | 10 | none | **Walls** building (defense bonus in city) |
| 6 | Archery | Military | 2 | 20 | Bronze Working | **Archer** unit (ranged attack) |
| 7 | Horseback Riding | Military | 3 | 30 | Archery | **Horseman** unit (fast mover, strong attacker) |
| 8 | Iron Working | Military | 4 | 40 | Horseback Riding, Mining | Warriors upgrade to **Swordsmen** (big combat boost) |
| 9 | Writing | Science & Culture | 1 | 10 | none | **Library** building (+science in city) |
| 10 | Mathematics | Science & Culture | 2 | 20 | Writing | Libraries give +1 extra science |
| 11 | Philosophy | Science & Culture | 3 | 30 | Mathematics | **Temple** building (+score/culture, small happiness or growth bonus `TODO`) |
| 12 | Education | Science & Culture | 4 | 40 | Philosophy, Engineering | **University** building (large science boost) |

**Total cost if you researched everything:** 300 science.

## Units and Buildings Summary

**Units (available from start):** Settler, Warrior, Worker
**Units (unlocked by tech):** Archer (Archery), Horseman (Horseback Riding)
**Upgrade (not a new unit):** Warrior → Swordsman (Iron Working)

**Buildings:** Granary, Workshop, Walls, Library, Temple, University

`TODO` Decide building costs (suggested: 20–60 production) and whether buildings have upkeep (suggested: no).

## Balance Targets

| Metric | Target |
|---|---|
| Science per turn, early game (turns 1–10) | ~3–6 |
| Science per turn, mid game (turns 11–20) | ~8–14 |
| Science per turn, late game (turns 21–30) | ~15–25 |
| Total science earned in a game | ~200–250 |
| Techs researched by a typical player | 8–9 of 12 |
| Turns to research a Tier 1 tech | ~2–3 |
| Turns to research a Tier 4 tech | ~3–4 |

If players finish the whole tree, raise costs. If they only get 4–5 techs, lower costs or raise base science.

## Scoring

- Each researched tech is worth **5 points** toward the score victory. Adjust after playtesting to balance.
- Buildings that unlock from techs (especially Temple and University) add extra score, which links research to the win condition.

## Data Format

Techs should live in `src/data/techs.ts` (or `.json`) as data, not hardcoded into game logic. Suggested shape:

```ts
export interface Tech {
  id: string;
  name: string;
  branch: "economy" | "military" | "science";
  tier: 1 | 2 | 3 | 4;
  cost: number;
  requires: string[]; // tech ids
  unlocks: {
    units?: string[];
    buildings?: string[];
    improvements?: string[];
    effects?: string[]; // e.g. "cityLimit+1"
  };
}

export const TECHS: Tech[] = [
  {
    id: "agriculture",
    name: "Agriculture",
    branch: "economy",
    tier: 1,
    cost: 10,
    requires: [],
    unlocks: { improvements: ["farm"], buildings: ["granary"] },
  },
  // ...
];
```

## AI Research Behavior

- The AI picks a research path by a simple rule: prioritize the cheapest available tech that unlocks something it wants (military units when at war, economy otherwise).
- Add slight randomness so AI players don't always research in the same order.

## Open Questions

- `TODO` Should players start with one free tech (e.g. Agriculture) to avoid a slow first few turns?
- `TODO` Should there be a "boost" mechanic (e.g. building a Farm makes Mining cheaper) to add flavor without adding complexity? Default: no.
- `TODO` Should the tree be visible in full from the start, or only show techs whose prerequisites are researched? (Suggested: show everything, since it helps planning in a short game.)
- `TODO` Theme names: keep the classic Civ names, or rename for your own setting?

## Answers to Open Questions
- Players should start with one free tech that they choose from a list of options
- No boost mechanic
- Show everything.
- Keep the classic Civ names