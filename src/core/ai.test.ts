import { describe, expect, it } from "vitest";
import { aiStrategy, runAiTurn } from "./ai";
import type { GameState } from "./state";
import { chooseStartingTech, newGame } from "./rules";
import { addCity, addUnit, giveTechs, makeState } from "./testUtils";

describe("AI", () => {
  it("picks research when it has none", () => {
    const s = makeState();
    addCity(s, 1, 4, 4);
    const after = runAiTurn(s, 1);
    expect(after.players[1]?.researching).not.toBeNull();
  });

  it("founds its capital with the starting settler on turn 1", () => {
    const s = chooseStartingTech(newGame({ seed: 5, difficulty: "normal" }), "writing");
    const after = runAiTurn(s, 1);
    expect(after.cities.filter((c) => c.owner === 1)).toHaveLength(1);
    expect(after.units.some((u) => u.owner === 1 && u.type === "settler")).toBe(false);
  });

  it("sets production in every city", () => {
    const s = makeState({ width: 12, height: 12 });
    addCity(s, 1, 2, 2);
    addCity(s, 1, 8, 8, { isCapital: false });
    const after = runAiTurn(s, 1);
    expect(after.cities.every((c) => c.current !== null)).toBe(true);
  });

  it("attacks a weaker adjacent enemy", () => {
    const s = makeState();
    addCity(s, 1, 1, 1);
    const h = addUnit(s, "horseman", 1, 4, 4);
    addUnit(s, "warrior", 0, 5, 4);
    const after = runAiTurn(s, 1);
    expect(after.units.some((u) => u.owner === 0)).toBe(false);
    expect(after.units.find((u) => u.id === h.id)?.hasAttacked).toBe(true);
  });

  it("does not make losing melee attacks", () => {
    const s = makeState();
    addCity(s, 1, 1, 1);
    const w = addUnit(s, "warrior", 1, 4, 4);
    addUnit(s, "horseman", 0, 5, 4);
    giveTechs(s, 0, ["bronzeWorking", "archery", "horsebackRiding"]);
    const after = runAiTurn(s, 1);
    expect(after.units.find((u) => u.id === w.id)).toBeDefined();
    expect(after.units.some((u) => u.owner === 0 && u.type === "horseman")).toBe(true);
  });

  it("archers use ranged attacks from 2 tiles away", () => {
    const s = makeState();
    addCity(s, 1, 0, 0);
    const a = addUnit(s, "archer", 1, 3, 3);
    addUnit(s, "warrior", 0, 5, 5);
    const after = runAiTurn(s, 1);
    expect(after.units.some((u) => u.owner === 0)).toBe(false);
    expect(after.units.find((u) => u.id === a.id)).toMatchObject({ x: 3, y: 3 });
  });

  it("workers build improvements in territory", () => {
    const s = makeState();
    giveTechs(s, 1, ["agriculture"]);
    addCity(s, 1, 4, 4);
    addUnit(s, "warrior", 1, 4, 4);
    const w = addUnit(s, "worker", 1, 5, 5);
    const after = runAiTurn(s, 1);
    expect(after.units.find((u) => u.id === w.id)?.task).toEqual({ kind: "improve", improvement: "farm" });
  });

  it("is deterministic for the same state and advances the RNG", () => {
    const s = chooseStartingTech(newGame({ seed: 9, difficulty: "normal" }), "agriculture");
    const a = runAiTurn(s, 2);
    const b = runAiTurn(s, 2);
    expect(a).toEqual(b);
    expect(a.rng).not.toBe(s.rng);
  });

  describe("culture strategy", () => {
    /** Finds a seed whose strategy for player 1 matches, so tests don't depend on one magic number. */
    function withStrategy(s: GameState, strategy: "culture" | "standard"): GameState {
      for (let seed = 1; seed < 500; seed++) {
        s.seed = seed;
        if (aiStrategy(s, 1) === strategy) return s;
      }
      throw new Error(`no seed gives ${strategy}`);
    }

    it("is fixed per game and assigns both strategies across seeds", () => {
      const s = makeState();
      expect(aiStrategy(s, 1)).toBe(aiStrategy(s, 1));
      const picks = new Set<string>();
      for (let seed = 1; seed <= 50; seed++) {
        s.seed = seed;
        picks.add(aiStrategy(s, 1));
        picks.add(aiStrategy(s, 2));
      }
      expect(picks).toEqual(new Set(["culture", "standard"]));
    });

    it("researches toward Philosophy", () => {
      const s = withStrategy(makeState(), "culture");
      addCity(s, 1, 4, 4);
      giveTechs(s, 1, ["agriculture", "bronzeWorking"]);
      expect(runAiTurn(s, 1).players[1]?.researching).toBe("writing");
      giveTechs(s, 1, ["writing"]);
      expect(runAiTurn(s, 1).players[1]?.researching).toBe("mathematics");
    });

    it("builds a Temple once it can, while a standard AI does not prioritise it", () => {
      const culture = withStrategy(makeState(), "culture");
      addCity(culture, 1, 4, 4);
      addUnit(culture, "warrior", 1, 4, 4);
      giveTechs(culture, 1, ["writing", "mathematics", "philosophy"]);
      expect(runAiTurn(culture, 1).cities[0]?.current).toEqual({ kind: "building", id: "temple" });

      const standard = withStrategy(makeState(), "standard");
      addCity(standard, 1, 4, 4);
      addUnit(standard, "warrior", 1, 4, 4);
      giveTechs(standard, 1, ["writing", "mathematics", "philosophy"]);
      expect(runAiTurn(standard, 1).cities[0]?.current).not.toEqual({ kind: "building", id: "temple" });
    });
  });
});
