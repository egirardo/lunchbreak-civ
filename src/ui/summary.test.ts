import { describe, expect, it } from "vitest";
import { addCity, makeState } from "../core/testUtils";
import { formatDuration, gameSummaryText } from "./summary";

describe("game summary", () => {
  it("formats durations as m:ss or h:mm:ss", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(872)).toBe("14:32");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("summarises the result, play time, and the player's stats", () => {
    const s = makeState();
    s.turn = 18;
    s.phase = "ended";
    s.winner = 0;
    s.victory = "domination";
    addCity(s, 0, 4, 4);
    const you = s.players[0];
    if (you) {
      you.citiesFounded = 1;
      you.stats.citiesCaptured = 2;
      you.stats.battlesWon = 3;
    }
    const p2 = s.players[2];
    if (p2) p2.alive = false;
    const text = gameSummaryText(s, 900);
    expect(text).toContain("Victory (Domination) on turn 18/30, Normal");
    expect(text).toContain("Play time 15:00 (avg 50s per turn)");
    expect(text).toContain("1 founded, 2 captured");
    expect(text).toContain("battles 3 won / 0 lost");
    expect(text).toContain("P2: eliminated");
  });
});
