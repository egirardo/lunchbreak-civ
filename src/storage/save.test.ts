import { describe, expect, it } from "vitest";
import { newGame } from "../core/rules";
import { clearSave, loadGame, saveGame } from "./save";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("save/load", () => {
  it("round-trips the game state and play time", () => {
    const storage = memoryStorage();
    const s = newGame({ seed: 9, difficulty: "normal" });
    saveGame(s, 123, storage);
    const loaded = loadGame(storage);
    expect(loaded?.state).toEqual(s);
    expect(loaded?.playSeconds).toBe(123);
    clearSave(storage);
    expect(loadGame(storage)).toBeNull();
  });

  it("loads saves written before stats and play time existed", () => {
    const storage = memoryStorage();
    const s = newGame({ seed: 9, difficulty: "normal" });
    const old = JSON.parse(JSON.stringify({ savedAt: 1, state: s })) as { state: { players: Record<string, unknown>[] } };
    for (const p of old.state.players) delete p.stats;
    storage.setItem("lunchbreak-civ:save", JSON.stringify(old));
    const loaded = loadGame(storage);
    expect(loaded?.playSeconds).toBe(0);
    expect(loaded?.state.players[0]?.stats.unitsBuilt).toBe(0);
  });
});
