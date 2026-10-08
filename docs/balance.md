# Balance Log — Lunchbreak Civ

Every balance change, with the observation that motivated it and before/after numbers. Newest first.

## Playtests

For each playtest, record: date, difficulty, total time, average seconds per turn, techs researched, cities founded, how the game ended, and qualitative notes. Mark anything not measured as unknown.

The end screen records these automatically. Use **Copy summary** and paste the text, plus your impressions, into a new entry. Play time excludes time with the tab hidden and caps each turn at 5 minutes.

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

### Playtest 2 — 2026-10-08

| Measure | Result |
|---|---|
| Difficulty | Easy |
| Total time | **19:55** (avg 40s per turn) |
| Turn the game ended | 30 (went the full length) |
| Ending | **Defeat on score**: 105 vs Golden Union 109 (Crimson Dominion 99) |
| Cities | 3 (2 founded, 1 captured, 0 lost) |
| Techs | 5 of 12 (AIs: 7 and 8) |
| Units | 5 built, 2 lost; battles 3 won, 2 lost |
| Buildings | 1 |
| Culture | 0 |

**Notes:** Stats came from the end-screen summary. The player felt they missed development opportunities because their other cities' panels were hard to reach. This game was played before the orders bar and Actions/Log tabs existed, when an open city panel hid the rest of the turn's options.

**Observations:**
- **Pacing is on target.** 19:55 total and 40s per turn match the 20-minute / 40-second design goals exactly.
- **A close finish.** All three scores ended within 10 points, which suggests the score race is competitive rather than a runaway.
- **Low tech count, likely a UI cause.** The player researched 5 techs against a target of 8–9; the Easy AIs got 7–8, with only 1 building total. By the player's account, cities were under-managed because their panels were hard to find, so this is more likely UI friction than science costs. Don't tune science until playtests on the new UI confirm it.
- **Easy may be harder than simulations suggest.** In simulation the AI-played human seat won 5 of 6 Easy games; here a human lost narrowly. One game isn't enough to act on.
- **Playtest 1's early-rush concern didn't recur.** One city was captured, but no rival was eliminated and the game went to turn 30.

### Playtest 3 — 2026-10-08

| Measure | Result |
|---|---|
| Difficulty | Normal |
| Total time | **18:11** (avg 36s per turn) |
| Turn the game ended | 30 (went the full length) |
| Ending | **Victory on score**: 141 vs Crimson Dominion 71, Golden Union 62 |
| Cities | 4 (3 founded, 1 captured, 0 lost); AIs ended with 1 each |
| Techs | 6 of 12 (AIs: 7 and 6) |
| Units | 9 built, 2 lost; battles 6 won, 2 lost |
| Buildings | 3 |
| Culture | 0 |

**Notes:** First game on Normal, and first with the orders bar and Actions/Log tabs. No written impressions yet.

**Observations:**
- **Pacing is still on target.** 18:11 at 36s per turn, within the 18–22 minute window.
- **A runaway win on Normal.** The player doubled both AI scores. Both AIs finished with a single city, far below the 2.7 average in simulation, so they either expanded poorly or lost cities to the player's 6 won battles. One game isn't enough to call Normal too easy, but it contrasts with Playtest 2's narrow loss on Easy.
- **Techs are low in every human game, for the AIs too.** The player got 5 and 6 techs in Playtests 2–3; here the AIs got 6–7, versus about 8 in AI-only simulations. Human games seem to run lower on science. Possible causes: more warfare disrupting AI cities, or less science-focused play. Worth one simulation comparing AI science when the human seat plays aggressively.
- **More buildings than Playtest 2** (3 vs 1) with the new UI, consistent with cities being easier to manage now.

**Follow-up simulation (player reported "the AIs didn't push back much"):** 40 seeds per row. Your seat was played either by the standard AI or by a scripted aggressive player that expands to about 3 cities, keeps building military, and marches spare units at the nearest rival city, attacking only with winning odds.

| Difficulty / your seat | You win | AI cities (on 1 city) | AI techs | AIs eliminated | AI attacks on you per game | AI army size at turn 15 |
|---|---|---|---|---|---|---|
| Normal / standard | 38% | 2.8 (9%) | 8.0 | 1% | 1.3 | 1.4 |
| **Normal / aggressive** | **63%** | **1.8 (40%)** | **6.9** | **28%** | 2.8 | 1.4 |
| Easy / standard | 63% | 2.1 (14%) | 7.1 | 4% | 0.7 | 1.1 |
| Easy / aggressive | 93% | 1.0 (68%) | 6.0 | 44% | 1.2 | 1.3 |

**Conclusions:**
- **The AI is too passive.** Against aggression on Normal it averages about 1.4 military units at turn 15, roughly one garrison per city, and only 2.8 attacks on the player in a whole game. It loses cities instead of fighting back.
- **Playtest 3 matches the aggressive-player profile.** AIs held to 1 city and 6–7 techs.
- **Low AI tech is a consequence of losing cities**, not a science-cost problem: 8.0 techs normally vs 6.9 under pressure.
- **Low human tech in Playtests 2–3 is a play-style effect.** The scripted aggressive player still reached 8.3 techs, so the science costs themselves aren't the cause. Don't tune science costs for this.


### Playtest 4 — 2026-10-08

| Measure | Result |
|---|---|
| Difficulty | Normal |
| Total time | **15:34** (avg 36s per turn) |
| Turn the game ended | **26** (early domination) |
| Ending | **Domination victory**: both rivals eliminated |
| Cities | 4 (2 founded, 2 captured, 0 lost) |
| Techs | 7 of 12 |
| Units | 9 built, **0 lost**; battles **3 won, 0 lost** |
| Buildings | 3 |
| Culture | 0 |

**Notes:** First game after the AI defence update (AIs research Bronze Working early, wall their capital from turn 6, and retaliate). Earlier in the game the player asked why three Warriors surrounding a city only gave +1 flanking. Flanking is a flat +1, so Warriors can't take a walled city (6 vs 7).

**Observations:**
- **Domination took only 3 battles.** Both rivals were eliminated with no units lost, so each capital fell to a single successful attack. Because losing the capital eliminates a player outright, one good attack per rival is enough to win the game.
- **The AI never pushed back.** Zero player losses, despite the new war mode and retaliation.
- **It beat the scripted aggressor by a wide margin.** In simulation, the aggressive player only won by domination in 2 of 40 Normal games after the AI update. The scripted aggressor marches at the *nearest* city with whatever units it has; a human picks the capital and brings units that beat Walls (Archers 8, Horsemen 9 with flanking). The simulation probably understates how exposed capitals are.
- **Shorter game.** 15:34, under the 18–22 minute target, because it ended on turn 26.

**Candidate fixes (not yet decided or tested):** make capitals sturdier (higher base defense, or a defence bonus from the garrison), keep a second AI defender next to the capital, or make capital capture less decisive (e.g. a player is only eliminated after losing all cities). Test each against a smarter "capital-hunting" scripted player first.

## Changes

### 2026-10-08 — AI defends itself and retaliates (AI behaviour only, no rule changes)

**Why:** In Playtest 3 the player said the AIs "didn't push back much". Simulation confirmed it: against an aggressive player on Normal, the player won 63% and 28% of AIs were eliminated (see Playtest 3).

**Root cause:** a city defends at max(5, garrison strength), so a Warrior garrison adds nothing. Two Warriors with the flanking bonus (6) take any city without Walls, and the AI only built Walls after the attack had started. Extra AI units alone (tried first) only moved the aggressive player's win rate from 63% to 58%.

**Changes (in `src/core/ai.ts`):**
- Research Bronze Working from turn 3, which unlocks Walls. Culture-strategy AIs only do this when under attack, which preserves the culture tuning.
- Wall the capital from turn 6; wall every city when at war.
- Prefer Archers (strength 7) as city garrisons.
- Keep a standing army of one unit per city plus one from turn 5.
- **War mode** when threatened or recently attacked (read from the last 6 turns of the event log): arm up to two units per city plus two, build Walls, and prefer military research.
- **Retaliate:** march on whoever attacked us as soon as our army is at least as strong, instead of only the weakest rival with a 1.3× edge.

**Result (40 seeds per row, Normal unless noted):**

| Measure | Before | After |
|---|---|---|
| Aggressive player wins | 63% | **33%** |
| AIs eliminated by an aggressive player | 28% | **5%** |
| AI cities at end, vs aggressive player | 1.8 | **2.3** |
| AI attacks on an aggressive player per game | 2.8 | **3.2** (95% of games have some) |
| Aggressive player wins on Easy | 93% | **68%** |
| Culture endings, AI-only games | 13 / 40 | **12 / 40** |
| Max AI turn time | ~5 ms | ~3 ms |
| Seat fairness, AI-only Normal (90 games, rotated start tech) | 47 / 21 / 32% | **39 / 26 / 36%** |

**Trade-off:** average techs dipped from about 8.0 to 7.4 per AI, because early production now goes into Walls and armies before Libraries. That's still near the 8–9 target. Watch it in playtests.

**Follow-up for playtests:** check that Normal now feels contested, without the AIs feeling unfair or relentless, and that Easy still feels forgiving.


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
