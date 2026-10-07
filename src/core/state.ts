import type { BuildingId } from "../data/buildings";
import type { ImprovementId } from "../data/improvements";
import type { TechId } from "../data/techs";
import type { TerrainId } from "../data/terrain";
import type { UnitTypeId } from "../data/units";

export const STATE_VERSION = 1;
export const HUMAN_PLAYER = 0;

export type PlayerId = number;
export type Difficulty = "easy" | "normal";
export type CityFocus = "balanced" | "food" | "production" | "science";
export type Phase = "chooseTech" | "playing" | "ended";
/** "eliminated" means the human lost their capital; `winner` is whoever took it. */
export type VictoryType = "score" | "domination" | "science" | "culture" | "eliminated";

export type BuildItem =
  | { kind: "unit"; id: UnitTypeId }
  | { kind: "building"; id: BuildingId };

export interface Tile {
  terrain: TerrainId;
  river: boolean;
  improvement: ImprovementId | null;
  owner: PlayerId | null;
  cityId: number | null;
}

export interface UnitTask {
  kind: "improve";
  improvement: ImprovementId;
}

export interface Unit {
  id: number;
  type: UnitTypeId;
  owner: PlayerId;
  x: number;
  y: number;
  movesLeft: number;
  hasAttacked: boolean;
  /** Player chose to skip this unit for the rest of the turn. */
  skipped: boolean;
  task: UnitTask | null;
}

export interface City {
  id: number;
  name: string;
  owner: PlayerId;
  x: number;
  y: number;
  population: number;
  food: number;
  production: number;
  current: BuildItem | null;
  buildings: BuildingId[];
  focus: CityFocus;
  isCapital: boolean;
  foundedTurn: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  color: string;
  pattern: string;
  isHuman: boolean;
  alive: boolean;
  science: number;
  researching: TechId | null;
  techs: TechId[];
  culture: number;
  /** Accumulated per-turn score from Temples and Universities. */
  bonusScore: number;
  /** Indexed by y * width + x. */
  explored: boolean[];
  citiesFounded: number;
}

export type EventKind =
  | "cityFounded"
  | "cityGrew"
  | "built"
  | "techResearched"
  | "combat"
  | "cityCaptured"
  | "playerEliminated"
  | "improvementBuilt"
  | "cultureWarning"
  | "gameOver";

export interface GameEvent {
  turn: number;
  kind: EventKind;
  message: string;
  /** Players this event concerns; used to filter what the human is told. */
  involves: PlayerId[];
  x?: number;
  y?: number;
}

export interface GameState {
  version: number;
  seed: number;
  rng: number;
  turn: number;
  maxTurns: number;
  width: number;
  height: number;
  difficulty: Difficulty;
  tiles: Tile[];
  units: Unit[];
  cities: City[];
  players: Player[];
  nextId: number;
  phase: Phase;
  winner: PlayerId | null;
  victory: VictoryType | null;
  events: GameEvent[];
}

export class RuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleError";
  }
}
