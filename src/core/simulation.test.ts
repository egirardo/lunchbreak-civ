import { describe, expect, it } from "vitest";
import { runAiTurn } from "./ai";
import { endTurn } from "./game";
import { citiesOf, computeScore } from "./queries";
import { chooseStartingTech, newGame } from "./rules";
import type { Difficulty, GameState } from "./state";

interface SimResult {
  state: GameState;
  maxAiTurnMs: number;
  unitsBuilt: number[];
}

/** Plays a full game with every seat, including the human's, driven by the AI. */
function simulate(seed: number, difficulty: Difficulty): SimResult {
  let s = chooseStartingTech(newGame({ seed, difficulty }), "agriculture");
  const seen = new Set(s.units.map((u) => u.id));
  const unitsBuilt = s.players.map(() => 0);
  let maxAiTurnMs = 0;

  const track = (state: GameState): void => {
    for (const u of state.units) {
      if (seen.has(u.id)) continue;
      seen.add(u.id);
      unitsBuilt[u.owner] = (unitsBuilt[u.owner] ?? 0) + 1;
    }
  };

  for (let guard = 0; guard < 40 && s.phase === "playing"; guard++) {
    let t = performance.now();
    s = runAiTurn(s, 0);
    maxAiTurnMs = Math.max(maxAiTurnMs, performance.now() - t);
    if (s.phase !== "playing") break;
    t = performance.now();
    s = endTurn(s); // two AI turns + round processing
    maxAiTurnMs = Math.max(maxAiTurnMs, (performance.now() - t) / 2);
    track(s);
  }
  return { state: s, maxAiTurnMs, unitsBuilt };
}

function summary(seed: number, difficulty: Difficulty, r: SimResult): string {
  const s = r.state;
  const players = s.players
    .map((p) => {
      const sc = computeScore(s, p.id).total;
      return `P${p.id}${p.alive ? "" : "(dead)"} c${citiesOf(s, p.id).length} t${p.techs.length} s${sc} u${r.unitsBuilt[p.id] ?? 0}`;
    })
    .join(" | ");
  return `[${difficulty} seed ${seed}] winner P${s.winner} by ${s.victory} on turn ${s.turn} | ${players} | maxAI ${r.maxAiTurnMs.toFixed(1)}ms`;
}

describe("full-game simulation", () => {
  const seeds = [1, 2, 3, 4, 5, 6];
  for (const difficulty of ["normal", "easy"] as Difficulty[]) {
    it(`plays 30-turn games to completion on ${difficulty}`, () => {
      for (const seed of seeds) {
        const r = simulate(seed, difficulty);
        console.log(summary(seed, difficulty, r));
        expect(r.state.phase).toBe("ended");
        expect(r.state.winner).not.toBeNull();
        expect(r.maxAiTurnMs).toBeLessThan(1000);
      }
    });
  }
});
