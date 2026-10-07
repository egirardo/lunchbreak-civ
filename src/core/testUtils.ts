import type { TerrainId } from "../data/terrain";
import type { TechId } from "../data/techs";
import type { UnitTypeId } from "../data/units";
import { UNITS } from "../data/units";
import { STATE_VERSION, type City, type GameState, type Player, type Unit } from "./state";

export function makeState(opts: { width?: number; height?: number; players?: number; terrain?: TerrainId } = {}): GameState {
  const width = opts.width ?? 8;
  const height = opts.height ?? 8;
  const count = opts.players ?? 3;
  const players: Player[] = Array.from({ length: count }, (_, id) => ({
    id,
    name: `P${id}`,
    color: "#000",
    pattern: "none",
    isHuman: id === 0,
    alive: true,
    science: 0,
    researching: null,
    techs: [],
    culture: 0,
    bonusScore: 0,
    explored: new Array<boolean>(width * height).fill(false),
    citiesFounded: 0,
  }));
  return {
    version: STATE_VERSION,
    seed: 1,
    rng: 1,
    turn: 1,
    maxTurns: 30,
    width,
    height,
    difficulty: "normal",
    tiles: Array.from({ length: width * height }, () => ({
      terrain: opts.terrain ?? "grassland",
      river: false,
      improvement: null,
      owner: null,
      cityId: null,
    })),
    units: [],
    cities: [],
    players,
    nextId: 100,
    phase: "playing",
    winner: null,
    victory: null,
    events: [],
  };
}

export function addUnit(s: GameState, type: UnitTypeId, owner: number, x: number, y: number): Unit {
  const u: Unit = { id: s.nextId++, type, owner, x, y, movesLeft: UNITS[type].moves, hasAttacked: false, skipped: false, task: null };
  s.units.push(u);
  return u;
}

/** Adds a city and claims its 3x3 area, mirroring foundCity without going through the action. */
export function addCity(s: GameState, owner: number, x: number, y: number, extra: Partial<City> = {}): City {
  const c: City = {
    id: s.nextId++,
    name: `City${s.nextId}`,
    owner,
    x,
    y,
    population: 1,
    food: 0,
    production: 0,
    current: null,
    buildings: [],
    focus: "balanced",
    isCapital: !s.cities.some((o) => o.owner === owner),
    foundedTurn: 1,
    ...extra,
  };
  s.cities.push(c);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tx = x + dx;
      const ty = y + dy;
      if (tx < 0 || ty < 0 || tx >= s.width || ty >= s.height) continue;
      const t = s.tiles[ty * s.width + tx];
      if (t && t.owner === null) {
        t.owner = owner;
        t.cityId = c.id;
      }
    }
  }
  return c;
}

export function setTerrain(s: GameState, x: number, y: number, terrain: TerrainId, river = false): void {
  const t = s.tiles[y * s.width + x];
  if (t) {
    t.terrain = terrain;
    t.river = river;
  }
}

export function giveTechs(s: GameState, pid: number, techs: TechId[]): void {
  const p = s.players[pid];
  if (p) p.techs.push(...techs);
}
