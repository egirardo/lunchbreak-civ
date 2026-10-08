import { citiesOf, computeScore } from "../core/queries";
import { HUMAN_PLAYER, type GameState, type VictoryType } from "../core/state";
import { plural } from "./format";

const VICTORY_NAMES: Record<VictoryType, string> = {
  score: "Score",
  domination: "Domination",
  science: "Science",
  culture: "Culture",
  eliminated: "Conquest",
};

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function averageSecondsPerTurn(s: GameState, playSeconds: number): number {
  return s.turn > 0 ? playSeconds / s.turn : 0;
}

/** Plain-text recap a player can paste into a playtest log. */
export function gameSummaryText(s: GameState, playSeconds: number): string {
  const you = s.players[HUMAN_PLAYER];
  if (!you) return "";
  const result = s.winner === HUMAN_PLAYER ? "Victory" : "Defeat";
  const how = s.victory ? ` (${VICTORY_NAMES[s.victory]})` : "";
  const st = you.stats;
  const cities = citiesOf(s, HUMAN_PLAYER).length;
  const lines = [
    `Lunchbreak Civ: ${result}${how} on turn ${s.turn}/${s.maxTurns}, ${s.difficulty === "easy" ? "Easy" : "Normal"}`,
    `Play time ${formatDuration(playSeconds)} (avg ${Math.round(averageSecondsPerTurn(s, playSeconds))}s per turn)`,
    `You: score ${computeScore(s, HUMAN_PLAYER).total}, ${cities === 1 ? "1 city" : `${cities} cities`} (${you.citiesFounded} founded, ${st.citiesCaptured} captured, ${st.citiesLost} lost), ` +
      `${plural(you.techs.length, "tech")}, units ${st.unitsBuilt} built / ${st.unitsLost} lost, battles ${st.battlesWon} won / ${st.battlesLost} lost, ` +
      `${plural(st.buildingsBuilt, "building")}, culture ${you.culture}`,
  ];
  for (const p of s.players) {
    if (p.id === HUMAN_PLAYER) continue;
    const c = citiesOf(s, p.id).length;
    lines.push(`${p.name}: ${p.alive ? `score ${computeScore(s, p.id).total}, ${c === 1 ? "1 city" : `${c} cities`}, ${plural(p.techs.length, "tech")}` : "eliminated"}`);
  }
  return lines.join("\n");
}
