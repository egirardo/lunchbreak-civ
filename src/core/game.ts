import { runAiTurn } from "./ai";
import { processEndOfRound } from "./rules";
import { HUMAN_PLAYER, RuleError, type GameState } from "./state";

/** Ends the human's turn: every living AI acts, then the round resolves and the next turn begins. */
export function endTurn(state: GameState): GameState {
  if (state.phase !== "playing") throw new RuleError("The game is not in progress.");
  let s = state;
  for (const p of s.players) {
    if (p.id === HUMAN_PLAYER || !s.players[p.id]?.alive) continue;
    s = runAiTurn(s, p.id);
    if (s.phase !== "playing") return s;
  }
  return processEndOfRound(s);
}
