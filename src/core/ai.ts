import { availableTechs, getPlayer } from "./queries";
import { setResearch } from "./rules";
import type { GameState, PlayerId } from "./state";

/** Placeholder AI: only keeps research going. Replaced by the full AI. */
export function runAiTurn(state: GameState, pid: PlayerId): GameState {
  let s = state;
  const p = getPlayer(s, pid);
  if (!p.researching) {
    const options = availableTechs(s, pid);
    if (options[0]) s = setResearch(s, pid, options[0]);
  }
  return s;
}
