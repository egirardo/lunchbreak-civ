# Balance Log — Lunchbreak Civ

Every balance change, with the observation that motivated it and before/after numbers. Newest first.

## Playtests

For each playtest, record: date, difficulty, total time, average seconds per turn, techs researched, cities founded, how the game ended, and qualitative notes. Mark anything not measured as unknown.

### Playtest 1 — 2026-10-08

| Measure | Result |
|---|---|
| Difficulty | Unknown |
| Total time | Not measured; felt under 20 minutes |
| Turn the game ended | Unknown (before turn 30) |
| Units built | 3 Warriors, 1 Worker |
| Techs / cities | Unknown |
| Ending | **Domination win**: captured both rival capitals |

**Notes:** The player won by taking the two nearby rival capitals with Warriors. It felt short.

**Hypothesis (not yet tested):** early rushes on capitals may be too easy. A city defends at 5, the same as a Warrior garrison. Two Warriors attacking together get +1 flanking (6 vs 5) and take any capital without Walls. Capturing a capital eliminates that player, so one early raid can knock a rival out entirely. The AI garrisons each city with one unit and only builds Walls once it sees a threat.

**Follow-up:** check in the next playtests whether early domination keeps happening. If it does, candidate fixes are a higher city base defense (5 → 6), a stronger capital, or AIs keeping a second defender in the capital. Each should be tested in simulation first.

## Changes

### 2026-10-07 — Culture threshold 20 → 25, Temple cost 30 → 40

**Why:** with AIs pursuing culture, culture victories ended 34 of 60 Normal games and culture-strategy AIs won 55% (fair share is about 33%).

**Result (60 seeds × Easy/Normal, all seats AI-driven):**

| Difficulty | Game endings | Culture-strategy wins | Standard wins |
|---|---|---|---|
| Normal | 17 culture / 40 score / 3 other | 43% (17 culture + 12 score, of 67) | 27% |
| Easy | 2 culture / 58 score | 40% (2 culture + 25 score, of 67) | 29% |

Average techs per player: 8.0 (Normal), 7.5 (Easy). Average cities: 2.7 / 2.4.

**Correction to the previous entry:** culture-strategy AIs do *not* win more often on score. On Normal their score-win rate (12/67, 18%) is below standard AIs' (27%); their edge comes entirely from culture victories. Easy figures are skewed because the human seat (AI-driven in simulation) has no Easy production penalty. Making the standard AI open with Writing/Mathematics was tried and made no measurable difference, so it was reverted.

**Still open:** culture-strategy AIs remain above a fair share on Normal (43%). Check in human playtests whether culture feels too strong before tuning further.


### 2026-10-07 — AI culture strategy (no rule changes yet)

**Change:** each AI now gets a fixed strategy per game, decided by the seed: 35% "culture" (rush Writing → Mathematics → Philosophy, then build Temples first), otherwise "standard". AIs build up military and attack at even odds when a rival reaches 25% of the culture threshold. Everyone is warned when a player passes halfway, and a Rivals panel shows each rival's culture.

**Simulation:** 60 seeds × Easy/Normal, all seats AI-driven, threshold 20, Temple cost 30.

| Difficulty | Game endings | Culture-strategy win rate | Standard win rate |
|---|---|---|---|
| Normal | 34 culture / 24 score / 2 other | 55% | 20% |
| Easy | 22 culture / 37 score / 1 other | 45% | 27% |

A fair share is about 33% in a 3-player game, so culture is currently too strong. The counter-attack logic made no measurable difference, because culture rises from 5 to 20 in about 4–5 turns, which is faster than armies can respond.

**Options tested (Normal, culture endings out of 60 / culture-strategy win rate):**

| Threshold | Temple cost | Culture endings | Culture-strategy wins |
|---|---|---|---|
| 20 | 30 (current) | 34 | 55% |
| 20 | 40 | 26 | 49% |
| 20 | 50 | 19 | 48% |
| 25 | 40 | 17 | 43% |

**Decision:** threshold 25, Temple cost 40 (see the next entry).


### 2026-10-07 — Culture victory threshold 40 → 20

**Observation (simulation, not a human playtest):** No game ever ended in a culture victory. The default AI built a Temple in only 12 of 60 games, around turn 29, and its best culture total was 12.

**Test:** 60 simulated games (30 seeds × Easy/Normal). The human seat rushed Writing (free) → Mathematics → Philosophy and built Temples as soon as they unlocked; the other seats used the normal AI.

| Measure | Result |
|---|---|
| Philosophy researched | 60/60 games, avg turn 18.2 |
| Temples built by the rusher | avg 2.0 |
| Rusher's culture at turn 30 | avg 33, max 56 |

| Threshold | Rusher reaches it | Avg turn reached | Non-culture AIs reach it |
|---|---|---|---|
| 15 | 57/60 | 26.8 | 0/60 |
| **20** | **53/60** | **27.5** | **0/60** |
| 25 | 46/60 | 28.5 | 0/60 |
| 30 | 40/60 | 29.1 | 0/60 |
| 40 (old) | — | — | 0/60 |

**Change:** threshold set to 20 (`RULES.cultureVictoryThreshold`). It's reachable when a player commits to culture, but never by accident.

**Follow-up for human playtests:**
- Check whether a culture rush feels too safe or too weak against AI aggression.
- The AI never pursues culture, so only the human can win this way. If that's unwanted, the AI needs a culture strategy.
