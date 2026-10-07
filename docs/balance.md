# Balance Log — Lunchbreak Civ

Every balance change, with the observation that motivated it and before/after numbers. Newest first.

## Playtests

_No human playtests logged yet. For each one, record: date, difficulty, total time, average seconds per turn, techs researched, cities founded, how the game ended, and qualitative notes._

## Changes

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

Culture-strategy AIs keep winning about 45–50% even when culture endings drop, because they also win on score. Rushing science is a stronger plan than the standard AI's economy-first research. That points at standard-AI weakness as well as culture tuning.

**Pending decision:** whether to raise Temple cost and/or the threshold.


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
