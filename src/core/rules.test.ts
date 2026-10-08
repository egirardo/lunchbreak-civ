import { describe, expect, it } from "vitest";
import { RULES } from "../data/config";
import { TECHS } from "../data/techs";
import { endTurn } from "./game";
import {
  attackTargets,
  cityYields,
  computeScore,
  defenseStrength,
  reachableTiles,
  tileYields,
  unitsNeedingOrders,
  workedTiles,
} from "./queries";
import {
  attack,
  buildImprovement,
  chooseStartingTech,
  foundCity,
  moveUnit,
  newGame,
  processEndOfRound,
  setFocus,
  setProduction,
  setResearch,
} from "./rules";
import { RuleError } from "./state";
import { addCity, addUnit, giveTechs, makeState, setTerrain } from "./testUtils";

describe("new game", () => {
  it("is deterministic for a seed and gives each player a settler and warrior", () => {
    const a = newGame({ seed: 42, difficulty: "normal" });
    const b = newGame({ seed: 42, difficulty: "normal" });
    expect(a.tiles).toEqual(b.tiles);
    expect(a.units).toEqual(b.units);
    expect(a.players).toHaveLength(3);
    for (const p of a.players) {
      const types = a.units.filter((u) => u.owner === p.id).map((u) => u.type).sort();
      expect(types).toEqual(["settler", "warrior"]);
    }
  });

  it("generates playable maps across many seeds", () => {
    for (let seed = 1; seed <= 40; seed++) {
      expect(() => newGame({ seed, difficulty: "normal" })).not.toThrow();
    }
  });

  it("starts in tech choice; AIs get a random tier-1 tech, the human picks one", () => {
    const s = newGame({ seed: 7, difficulty: "normal" });
    expect(s.phase).toBe("chooseTech");
    expect(s.players[0]?.techs).toEqual([]);
    expect(s.players[1]?.techs).toHaveLength(1);
    const after = chooseStartingTech(s, "writing");
    expect(after.phase).toBe("playing");
    expect(after.players[0]?.techs).toEqual(["writing"]);
    expect(() => chooseStartingTech(s, "mining")).toThrow(RuleError);
  });
});

describe("cities", () => {
  it("founding consumes the settler, makes a capital, and claims a 3x3 area", () => {
    const s = makeState();
    const settler = addUnit(s, "settler", 0, 3, 3);
    const after = foundCity(s, settler.id);
    expect(after.units).toHaveLength(0);
    expect(after.cities).toHaveLength(1);
    expect(after.cities[0]?.isCapital).toBe(true);
    expect(after.tiles.filter((t) => t.owner === 0)).toHaveLength(9);
  });

  it("enforces the city limit, raised by Civil Service", () => {
    const s = makeState({ width: 12, height: 12 });
    [1, 4, 7, 10].forEach((x) => addCity(s, 0, x, 1));
    const settler = addUnit(s, "settler", 0, 5, 8);
    expect(() => foundCity(s, settler.id)).toThrow(/city limit/);
    giveTechs(s, 0, ["civilService"]);
    expect(foundCity(s, settler.id).cities).toHaveLength(5);
  });

  it("tile yields include river food and the city-tile production bonus", () => {
    const s = makeState();
    setTerrain(s, 1, 1, "forest", true);
    expect(tileYields(s, 1, 1)).toEqual({ food: 2, production: 1, science: 0 });
    addCity(s, 0, 4, 4);
    expect(tileYields(s, 4, 4)).toEqual({ food: 1, production: 1, science: 0 });
  });

  it("base science is 1 + 1 per 2 population, plus library bonuses", () => {
    const s = makeState();
    const c = addCity(s, 0, 4, 4, { population: 5 });
    expect(cityYields(s, c).science).toBe(3);
    c.buildings.push("library");
    expect(cityYields(s, c).science).toBe(4);
    giveTechs(s, 0, ["mathematics"]);
    expect(cityYields(s, c).science).toBe(5);
  });

  it("science focus needs a library and gives +50% science", () => {
    const s = makeState();
    const c = addCity(s, 0, 4, 4, { population: 4 });
    expect(() => setFocus(s, c.id, "science")).toThrow(/Library/);
    c.buildings.push("library");
    const after = setFocus(s, c.id, "science");
    const city = after.cities[0];
    expect(city && cityYields(after, city).science).toBe(6); // (1 + 2 + 1) * 1.5
  });

  it("production focus works production tiles first", () => {
    const s = makeState();
    setTerrain(s, 3, 3, "hills");
    setTerrain(s, 5, 5, "grassland", true);
    const c = addCity(s, 0, 4, 4);
    expect(workedTiles(s, c)).toEqual([{ x: 5, y: 5 }]);
    c.focus = "production";
    expect(workedTiles(s, c)).toEqual([{ x: 3, y: 3 }]);
  });

  it("grows at 10 food, resets the pool, and caps at 6 population", () => {
    const s = makeState();
    const c = addCity(s, 0, 4, 4, { food: 9 });
    const after = processEndOfRound(s);
    expect(after.cities[0]?.population).toBe(2);
    expect(after.cities[0]?.food).toBe(0);

    const capped = makeState();
    addCity(capped, 0, 4, 4, { population: 6, food: 9 });
    expect(processEndOfRound(capped).cities[0]?.population).toBe(6);
    expect(c.id).toBeGreaterThan(0);
  });

  it("expands territory to radius 2 at population 4", () => {
    const s = makeState();
    addCity(s, 0, 4, 4, { population: 3, food: 9 });
    const after = processEndOfRound(s);
    expect(after.tiles.filter((t) => t.owner === 0)).toHaveLength(25);
  });

  it("completes production and carries overflow", () => {
    const s = makeState();
    setTerrain(s, 3, 3, "hills");
    const c = addCity(s, 0, 4, 4, { production: 19, focus: "production" });
    const after = processEndOfRound(setProduction(s, c.id, { kind: "unit", id: "warrior" }));
    expect(after.units.filter((u) => u.type === "warrior")).toHaveLength(1);
    expect(after.cities[0]?.production).toBe(2); // 19 + 3 - 20
    expect(after.cities[0]?.current).toEqual({ kind: "unit", id: "warrior" });
  });

  it("buildings can only be built once and clear the queue", () => {
    const s = makeState();
    giveTechs(s, 0, ["agriculture"]);
    const c = addCity(s, 0, 4, 4, { production: 20 });
    const after = processEndOfRound(setProduction(s, c.id, { kind: "building", id: "granary" }));
    const city = after.cities[0];
    expect(city?.buildings).toEqual(["granary"]);
    expect(city?.current).toBeNull();
    expect(() => setProduction(after, c.id, { kind: "building", id: "granary" })).toThrow(RuleError);
  });
});

describe("research", () => {
  it("completes when science reaches the cost and resets the pool to 0", () => {
    const s = makeState();
    addCity(s, 0, 4, 4);
    const p = s.players[0];
    if (p) p.science = 9;
    const after = processEndOfRound(setResearch(s, 0, "writing"));
    expect(after.players[0]?.techs).toContain("writing");
    expect(after.players[0]?.science).toBe(0);
    expect(after.players[0]?.researching).toBeNull();
  });

  it("rejects techs whose prerequisites are missing", () => {
    expect(() => setResearch(makeState(), 0, "mining")).toThrow(RuleError);
  });

  it("Iron Working upgrades warriors and the build queue", () => {
    const s = makeState();
    giveTechs(s, 0, ["agriculture", "mining", "bronzeWorking", "archery", "horsebackRiding"]);
    const c = addCity(s, 0, 4, 4, { current: { kind: "unit", id: "warrior" } });
    addUnit(s, "warrior", 0, 1, 1);
    const p = s.players[0];
    if (p) p.science = 40;
    const after = processEndOfRound(setResearch(s, 0, "ironWorking"));
    expect(after.units[0]?.type).toBe("swordsman");
    expect(after.cities.find((x) => x.id === c.id)?.current).toEqual({ kind: "unit", id: "swordsman" });
  });
});

describe("movement", () => {
  it("reaches tiles within its moves, blocked by impassable terrain, units, and enemy cities", () => {
    const s = makeState();
    const w = addUnit(s, "warrior", 0, 0, 0);
    expect(reachableTiles(s, w)).toHaveLength(8); // radius 2 clipped by the corner = 3x3, minus its own tile
    setTerrain(s, 1, 0, "water");
    setTerrain(s, 0, 1, "mountains");
    addUnit(s, "warrior", 1, 1, 1);
    expect(reachableTiles(s, w)).toHaveLength(0);
  });

  it("moving spends movement points", () => {
    const s = makeState();
    const w = addUnit(s, "warrior", 0, 0, 0);
    const after = moveUnit(s, w.id, { x: 1, y: 1 });
    expect(after.units[0]).toMatchObject({ x: 1, y: 1, movesLeft: 1 });
    expect(() => moveUnit(after, w.id, { x: 3, y: 3 })).toThrow(RuleError);
  });
});

describe("combat", () => {
  it("ties go to the defender and the attacker is removed", () => {
    const s = makeState();
    const a = addUnit(s, "warrior", 0, 2, 2);
    addUnit(s, "warrior", 1, 3, 2);
    const r = attack(s, a.id, { x: 3, y: 2 });
    expect(r.attackerWon).toBe(false);
    expect(r.state.units.map((u) => u.owner)).toEqual([1]);
  });

  it("flanking gives +1 and breaks the tie", () => {
    const s = makeState();
    const a = addUnit(s, "warrior", 0, 2, 2);
    addUnit(s, "warrior", 0, 4, 3);
    addUnit(s, "warrior", 1, 3, 2);
    const r = attack(s, a.id, { x: 3, y: 2 });
    expect(r.attack).toBe(6);
    expect(r.attackerWon).toBe(true);
    expect(r.state.units.filter((u) => u.owner === 1)).toHaveLength(0);
    expect(r.state.units.find((u) => u.id === a.id)).toMatchObject({ x: 2, y: 2, movesLeft: 0 });
  });

  it("a failed ranged attack leaves the archer alive", () => {
    const s = makeState();
    const archer = addUnit(s, "archer", 0, 1, 1);
    addUnit(s, "horseman", 1, 3, 3);
    const r = attack(s, archer.id, { x: 3, y: 3 });
    expect(r.attackerWon).toBe(false);
    expect(r.state.units).toHaveLength(2);
  });

  it("workers cannot be attacked", () => {
    const s = makeState();
    const w = addUnit(s, "warrior", 0, 2, 2);
    addUnit(s, "worker", 1, 3, 2);
    expect(attackTargets(s, w)).toEqual([]);
  });

  it("cities defend at 5 or the garrison's strength, and walls add 50%", () => {
    const s = makeState();
    const c = addCity(s, 1, 4, 4);
    expect(defenseStrength(s, c)).toBe(5);
    c.buildings.push("walls");
    expect(defenseStrength(s, c)).toBe(7);
    addUnit(s, "archer", 1, 4, 4);
    expect(defenseStrength(s, c)).toBe(10);
  });

  it("capturing a capital eliminates that player; the last player standing wins by domination", () => {
    const s = makeState({ players: 2 });
    addCity(s, 1, 4, 4);
    addCity(s, 1, 7, 7, { isCapital: false });
    addUnit(s, "warrior", 1, 6, 6);
    const h = addUnit(s, "horseman", 0, 3, 3);
    const r = attack(s, h.id, { x: 4, y: 4 });
    expect(r.capturedCityId).not.toBeNull();
    expect(r.state.cities).toHaveLength(1);
    expect(r.state.cities[0]?.owner).toBe(0);
    expect(r.state.units.every((u) => u.owner === 0)).toBe(true);
    expect(r.state.players[1]?.alive).toBe(false);
    expect(r.state.phase).toBe("ended");
    expect(r.state.victory).toBe("domination");
  });

  it("losing the human capital ends the game", () => {
    const s = makeState();
    addCity(s, 0, 4, 4);
    const h = addUnit(s, "horseman", 1, 3, 3);
    const r = attack(s, h.id, { x: 4, y: 4 });
    expect(r.state.phase).toBe("ended");
    expect(r.state.winner).toBe(1);
    expect(r.state.victory).toBe("eliminated");
  });

  it("easy AI does not attack before turn 10", () => {
    const s = makeState();
    s.difficulty = "easy";
    const a = addUnit(s, "warrior", 1, 2, 2);
    addUnit(s, "settler", 0, 3, 2);
    expect(attackTargets(s, a)).toEqual([]);
    s.turn = 10;
    expect(attackTargets(s, a)).toHaveLength(1);
  });
});

describe("workers", () => {
  it("build an improvement in own territory, finished at end of round", () => {
    const s = makeState();
    giveTechs(s, 0, ["agriculture"]);
    addCity(s, 0, 4, 4);
    const w = addUnit(s, "worker", 0, 5, 5);
    const busy = buildImprovement(s, w.id, "farm");
    expect(busy.units[0]?.movesLeft).toBe(0);
    const after = processEndOfRound(busy);
    expect(after.tiles[5 * 8 + 5]?.improvement).toBe("farm");
    expect(after.units[0]?.task).toBeNull();
    expect(after.units[0]?.movesLeft).toBe(2);
  });

  it("cannot build outside territory or without the tech", () => {
    const s = makeState();
    addCity(s, 0, 4, 4);
    const w = addUnit(s, "worker", 0, 5, 5);
    expect(() => buildImprovement(s, w.id, "farm")).toThrow(/tech/);
    giveTechs(s, 0, ["agriculture"]);
    const outside = addUnit(s, "worker", 0, 0, 0);
    expect(() => buildImprovement(s, outside.id, "farm")).toThrow(/territory/);
  });
});

describe("victory and scoring", () => {
  it("scores cities, population, techs, territory, and building bonuses", () => {
    const s = makeState();
    addCity(s, 0, 4, 4, { population: 3 });
    giveTechs(s, 0, ["writing", "agriculture"]);
    const p = s.players[0];
    if (p) p.bonusScore = 4;
    expect(computeScore(s, 0)).toEqual({ cities: 10, population: 3, techs: 10, territory: 9, buildings: 4, total: 36 });
  });

  it("temples add culture and score each round; reaching the culture threshold wins", () => {
    const s = makeState();
    addCity(s, 0, 4, 4, { buildings: ["temple"] });
    const p = s.players[0];
    if (p) p.culture = RULES.cultureVictoryThreshold - 2;
    const after = processEndOfRound(s);
    expect(after.players[0]?.bonusScore).toBe(2);
    expect(after.phase).toBe("ended");
    expect(after.victory).toBe("culture");
  });

  it("warns every player once when someone passes halfway to a culture victory", () => {
    const s = makeState();
    addCity(s, 1, 4, 4, { buildings: ["temple"] });
    const p = s.players[1];
    if (p) p.culture = RULES.cultureVictoryThreshold / 2 - 1;
    const after = processEndOfRound(s);
    const warnings = after.events.filter((e) => e.kind === "cultureWarning");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.involves).toContain(0);
    expect(processEndOfRound(after).events.filter((e) => e.kind === "cultureWarning")).toHaveLength(1);
  });

  it("culture just below the threshold does not win", () => {
    const s = makeState();
    addCity(s, 0, 4, 4, { buildings: ["temple"] });
    const p = s.players[0];
    if (p) p.culture = RULES.cultureVictoryThreshold - 3;
    expect(processEndOfRound(s).phase).toBe("playing");
  });

  it("researching all 12 techs wins by science", () => {
    const s = makeState();
    addCity(s, 0, 4, 4);
    giveTechs(s, 0, TECHS.filter((t) => t.id !== "education").map((t) => t.id));
    const p = s.players[0];
    if (p) p.science = 40;
    const after = processEndOfRound(setResearch(s, 0, "education"));
    expect(after.victory).toBe("science");
    expect(after.winner).toBe(0);
  });

  it("after turn 30 the highest score wins, ties broken by techs", () => {
    const s = makeState();
    s.turn = 30;
    addCity(s, 1, 1, 1);
    addCity(s, 2, 6, 6);
    giveTechs(s, 2, ["writing"]);
    const p1 = s.players[1];
    if (p1) p1.bonusScore = 5;
    const after = processEndOfRound(s);
    expect(after.phase).toBe("ended");
    expect(after.victory).toBe("score");
    expect(after.winner).toBe(2);
  });
});

describe("units needing orders", () => {
  it("lists units with moves left that aren't skipped or working, in id order", () => {
    const s = makeState();
    const a = addUnit(s, "warrior", 0, 1, 1);
    const b = addUnit(s, "worker", 0, 2, 2);
    const c = addUnit(s, "archer", 0, 3, 3);
    addUnit(s, "warrior", 1, 5, 5);
    b.skipped = true;
    c.movesLeft = 0;
    const d = addUnit(s, "settler", 0, 4, 4);
    d.task = { kind: "improve", improvement: "farm" };
    expect(unitsNeedingOrders(s, 0).map((u) => u.id)).toEqual([a.id]);
  });
});

describe("player stats", () => {
  it("count units and buildings built", () => {
    const s = makeState();
    giveTechs(s, 0, ["agriculture"]);
    const c = addCity(s, 0, 4, 4, { production: 20, current: { kind: "unit", id: "warrior" } });
    const one = processEndOfRound(s);
    expect(one.players[0]?.stats.unitsBuilt).toBe(1);
    const two = processEndOfRound(setProduction({ ...one, cities: one.cities.map((x) => ({ ...x, production: 20 })) }, c.id, { kind: "building", id: "granary" }));
    expect(two.players[0]?.stats.buildingsBuilt).toBe(1);
  });

  it("count battles and losses on both sides", () => {
    const s = makeState();
    const a = addUnit(s, "warrior", 0, 2, 2);
    addUnit(s, "warrior", 1, 3, 2);
    const lost = attack(s, a.id, { x: 3, y: 2 }).state;
    expect(lost.players[0]?.stats).toMatchObject({ battlesLost: 1, unitsLost: 1, battlesWon: 0 });
    expect(lost.players[1]?.stats).toMatchObject({ battlesWon: 1, unitsLost: 0 });

    const archerState = makeState();
    const archer = addUnit(archerState, "archer", 0, 1, 1);
    addUnit(archerState, "horseman", 1, 3, 3);
    const failed = attack(archerState, archer.id, { x: 3, y: 3 }).state;
    expect(failed.players[0]?.stats).toMatchObject({ battlesLost: 1, unitsLost: 0 });
  });

  it("count captured and lost cities", () => {
    const s = makeState();
    addCity(s, 1, 4, 4);
    addCity(s, 1, 7, 7, { isCapital: false });
    addCity(s, 2, 0, 7);
    const h = addUnit(s, "horseman", 0, 6, 6);
    const r = attack(s, h.id, { x: 7, y: 7 }).state;
    expect(r.players[0]?.stats).toMatchObject({ citiesCaptured: 1, battlesWon: 1 });
    expect(r.players[1]?.stats).toMatchObject({ citiesLost: 1, battlesLost: 1 });
  });
});

describe("turn flow", () => {
  it("endTurn runs the AIs, advances the turn, and restores moves", () => {
    const s = chooseStartingTech(newGame({ seed: 3, difficulty: "normal" }), "agriculture");
    const human = s.units.find((u) => u.owner === 0 && u.type === "warrior");
    if (!human) throw new Error("no warrior");
    const target = reachableTiles(s, human)[0];
    if (!target) throw new Error("no move");
    const moved = moveUnit(s, human.id, target);
    const next = endTurn(moved);
    expect(next.turn).toBe(2);
    expect(next.units.find((u) => u.id === human.id)?.movesLeft).toBe(2);
  });

  it("state survives a JSON round trip (needed for auto-save)", () => {
    const s = newGame({ seed: 11, difficulty: "easy" });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });
});
