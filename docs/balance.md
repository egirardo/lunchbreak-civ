# Balance Log — Lunchbreak Civ

Every balance change, with the observation that motivated it and before/after numbers. Newest first.

## Playtests

_No human playtests logged yet. For each one, record: date, difficulty, total time, average seconds per turn, techs researched, cities founded, how the game ended, and qualitative notes._

## Changes

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
