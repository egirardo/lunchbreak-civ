import { BUILDINGS, type BuildingId } from "../data/buildings";
import { RULES } from "../data/config";
import { IMPROVEMENTS, type ImprovementId } from "../data/improvements";
import { TECHS, TECH_BY_ID, type TechEffect, type TechId } from "../data/techs";
import { TERRAIN, type Yields } from "../data/terrain";
import { UNITS, type UnitTypeId } from "../data/units";
import { inBounds, neighbors, pointsInRadius, tileIndex, type Point } from "./grid";
import type { BuildItem, City, GameState, Player, PlayerId, Tile, Unit } from "./state";

// ---------- lookups ----------

export function getTile(s: GameState, x: number, y: number): Tile | undefined {
  if (!inBounds(s, x, y)) return undefined;
  return s.tiles[tileIndex(s, x, y)];
}

export function unitAt(s: GameState, x: number, y: number): Unit | undefined {
  return s.units.find((u) => u.x === x && u.y === y);
}

export function cityAt(s: GameState, x: number, y: number): City | undefined {
  return s.cities.find((c) => c.x === x && c.y === y);
}

export function getUnit(s: GameState, id: number): Unit | undefined {
  return s.units.find((u) => u.id === id);
}

export function getCity(s: GameState, id: number): City | undefined {
  return s.cities.find((c) => c.id === id);
}

export function getPlayer(s: GameState, id: PlayerId): Player {
  const p = s.players[id];
  if (!p) throw new Error(`No player ${id}`);
  return p;
}

export function citiesOf(s: GameState, pid: PlayerId): City[] {
  return s.cities.filter((c) => c.owner === pid);
}

export function unitsOf(s: GameState, pid: PlayerId): Unit[] {
  return s.units.filter((u) => u.owner === pid);
}

export function isPassable(s: GameState, x: number, y: number): boolean {
  const t = getTile(s, x, y);
  return t !== undefined && TERRAIN[t.terrain].passable;
}

// ---------- techs ----------

export function hasTech(s: GameState, pid: PlayerId, tech: TechId): boolean {
  return getPlayer(s, pid).techs.includes(tech);
}

export function hasEffect(s: GameState, pid: PlayerId, effect: TechEffect): boolean {
  return getPlayer(s, pid).techs.some((t) => TECH_BY_ID[t].unlocks.effects?.includes(effect));
}

export function availableTechs(s: GameState, pid: PlayerId): TechId[] {
  const p = getPlayer(s, pid);
  return TECHS.filter((t) => !p.techs.includes(t.id) && t.requires.every((r) => p.techs.includes(r))).map((t) => t.id);
}

export function cityLimit(s: GameState, pid: PlayerId): number {
  return RULES.baseCityLimit + (hasEffect(s, pid, "cityLimit+1") ? 1 : 0);
}

// ---------- yields ----------

export function tileYields(s: GameState, x: number, y: number): Yields {
  const t = getTile(s, x, y);
  if (!t) return { food: 0, production: 0, science: 0 };
  const base = TERRAIN[t.terrain].yields;
  const y2: Yields = { ...base };
  if (t.river && TERRAIN[t.terrain].passable) y2.food += RULES.riverFoodBonus;
  if (t.improvement) {
    const b = IMPROVEMENTS[t.improvement].bonus;
    y2.food += b.food;
    y2.production += b.production;
    y2.science += b.science;
  }
  if (cityAt(s, x, y)) y2.production += RULES.cityTileProductionBonus;
  return y2;
}

/** Tiles the city could work: its own territory, minus its centre, passable, not occupied by an enemy. */
export function workableTiles(s: GameState, city: City): Point[] {
  const out: Point[] = [];
  s.tiles.forEach((t, i) => {
    if (t.cityId !== city.id) return;
    const x = i % s.width;
    const y = Math.floor(i / s.width);
    if (x === city.x && y === city.y) return;
    if (!TERRAIN[t.terrain].passable) return;
    const occupant = unitAt(s, x, y);
    if (occupant && occupant.owner !== city.owner) return;
    out.push({ x, y });
  });
  return out;
}

function focusScore(y: Yields, focus: City["focus"]): number {
  const total = y.food + y.production + y.science;
  switch (focus) {
    case "food":
      return y.food * 10 + total;
    case "production":
      return y.production * 10 + total;
    default:
      // Balanced/science: highest total, tie-break toward food so cities keep growing.
      return total * 10 + y.food;
  }
}

/** The centre tile is always worked for free; population works the best other tiles. */
export function workedTiles(s: GameState, city: City): Point[] {
  const scored = workableTiles(s, city).map((p) => ({ p, score: focusScore(tileYields(s, p.x, p.y), city.focus) }));
  scored.sort((a, b) => b.score - a.score || a.p.y - b.p.y || a.p.x - b.p.x);
  return scored.slice(0, city.population).map((e) => e.p);
}

export interface CityYields {
  food: number;
  production: number;
  science: number;
  culture: number;
  scorePerTurn: number;
}

export function cityYields(s: GameState, city: City): CityYields {
  let food = 0;
  let production = 0;
  let science = 0;
  for (const p of [{ x: city.x, y: city.y }, ...workedTiles(s, city)]) {
    const y = tileYields(s, p.x, p.y);
    food += y.food;
    production += y.production;
    science += y.science;
  }
  science += RULES.cityBaseScience + Math.floor(city.population / RULES.populationPerScience);

  let culture = 0;
  let scorePerTurn = 0;
  for (const b of city.buildings) {
    const def = BUILDINGS[b];
    food += def.food;
    production += def.production;
    science += def.science;
    culture += def.culture;
    scorePerTurn += def.scorePerTurn;
  }
  if (city.buildings.includes("library") && hasEffect(s, city.owner, "libraryScience+1")) science += 1;
  if (city.focus === "science" && city.buildings.includes("library")) {
    science = Math.floor(science * RULES.scienceFocusMultiplier);
  }

  const owner = getPlayer(s, city.owner);
  if (!owner.isHuman && s.difficulty === "easy") {
    production = Math.floor(production * RULES.easy.aiProductionMultiplier);
  }
  return { food, production, science, culture, scorePerTurn };
}

export function playerSciencePerTurn(s: GameState, pid: PlayerId): number {
  return citiesOf(s, pid).reduce((sum, c) => sum + cityYields(s, c).science, 0);
}

// ---------- production ----------

export function itemCost(item: BuildItem): number {
  return item.kind === "unit" ? UNITS[item.id].cost : BUILDINGS[item.id].cost;
}

export function itemName(item: BuildItem): string {
  return item.kind === "unit" ? UNITS[item.id].name : BUILDINGS[item.id].name;
}

export function canBuildUnit(s: GameState, pid: PlayerId, unit: UnitTypeId): boolean {
  const def = UNITS[unit];
  if (def.requiresTech && !hasTech(s, pid, def.requiresTech)) return false;
  if (def.obsoletedBy && hasTech(s, pid, def.obsoletedBy)) return false;
  return true;
}

export function canBuildBuilding(s: GameState, city: City, building: BuildingId): boolean {
  return !city.buildings.includes(building) && hasTech(s, city.owner, BUILDINGS[building].requiresTech);
}

export function buildableItems(s: GameState, city: City): BuildItem[] {
  const units = (Object.keys(UNITS) as UnitTypeId[])
    .filter((u) => canBuildUnit(s, city.owner, u))
    .map((id): BuildItem => ({ kind: "unit", id }));
  const buildings = (Object.keys(BUILDINGS) as BuildingId[])
    .filter((b) => canBuildBuilding(s, city, b))
    .map((id): BuildItem => ({ kind: "building", id }));
  return [...units, ...buildings];
}

export function isItemBuildable(s: GameState, city: City, item: BuildItem): boolean {
  return item.kind === "unit" ? canBuildUnit(s, city.owner, item.id) : canBuildBuilding(s, city, item.id);
}

// ---------- movement & combat ----------

export interface Reachable extends Point {
  cost: number;
}

/** Tiles the unit can move to this turn (excluding its own tile). One unit per tile; enemy cities block. */
export function reachableTiles(s: GameState, unit: Unit): Reachable[] {
  if (unit.movesLeft <= 0 || unit.task) return [];
  const best = new Map<number, number>([[tileIndex(s, unit.x, unit.y), 0]]);
  const queue: Reachable[] = [{ x: unit.x, y: unit.y, cost: 0 }];
  const out: Reachable[] = [];
  while (queue.length > 0) {
    const cur = queue.shift() as Reachable;
    if (cur.cost >= unit.movesLeft) continue;
    for (const n of neighbors(s, cur.x, cur.y)) {
      const i = tileIndex(s, n.x, n.y);
      const cost = cur.cost + 1;
      if ((best.get(i) ?? Infinity) <= cost) continue;
      if (!isPassable(s, n.x, n.y)) continue;
      if (unitAt(s, n.x, n.y)) continue;
      const city = cityAt(s, n.x, n.y);
      if (city && city.owner !== unit.owner) continue;
      best.set(i, cost);
      out.push({ x: n.x, y: n.y, cost });
      queue.push({ x: n.x, y: n.y, cost });
    }
  }
  return out;
}

function hasFlank(s: GameState, attacker: Unit, target: Point): boolean {
  return neighbors(s, target.x, target.y).some((p) => {
    const u = unitAt(s, p.x, p.y);
    return u !== undefined && u.owner === attacker.owner && u.id !== attacker.id;
  });
}

export function attackStrength(s: GameState, attacker: Unit, target: Point): number {
  return UNITS[attacker.type].strength + (hasFlank(s, attacker, target) ? RULES.flankingBonus : 0);
}

export function defenseStrength(s: GameState, target: Point): number {
  const unit = unitAt(s, target.x, target.y);
  const city = cityAt(s, target.x, target.y);
  const unitStrength = unit ? UNITS[unit.type].strength : 0;
  if (!city) return unitStrength;
  const base = Math.max(RULES.cityBaseDefense, unitStrength);
  const multiplier = city.buildings.reduce((m, b) => m * BUILDINGS[b].defenseMultiplier, 1);
  return Math.floor(base * multiplier);
}

export interface CombatPreview {
  attack: number;
  defense: number;
  attackerWins: boolean;
  flanking: boolean;
}

export function combatPreview(s: GameState, attacker: Unit, target: Point): CombatPreview {
  const attack = attackStrength(s, attacker, target);
  const defense = defenseStrength(s, target);
  return { attack, defense, attackerWins: attack > defense, flanking: hasFlank(s, attacker, target) };
}

/** Enemy tiles this unit may attack right now (must be visible to its owner). */
export function attackTargets(s: GameState, unit: Unit): Point[] {
  const def = UNITS[unit.type];
  if (def.attack === "none" || unit.movesLeft <= 0 || unit.hasAttacked || unit.task) return [];
  if (!getPlayer(s, unit.owner).isHuman && s.difficulty === "easy" && s.turn < RULES.easy.aiNoAttackBeforeTurn) return [];
  const visible = visibleTiles(s, unit.owner);
  const out: Point[] = [];
  for (const p of pointsInRadius(s, unit.x, unit.y, def.range)) {
    if (p.x === unit.x && p.y === unit.y) continue;
    if (!visible[tileIndex(s, p.x, p.y)]) continue;
    const city = cityAt(s, p.x, p.y);
    const target = unitAt(s, p.x, p.y);
    const enemyCity = city !== undefined && city.owner !== unit.owner;
    const enemyUnit = target !== undefined && target.owner !== unit.owner && (UNITS[target.type].canBeAttacked || enemyCity);
    if (enemyCity || enemyUnit) out.push(p);
  }
  return out;
}

// ---------- settling & improvements ----------

export function foundCityProblem(s: GameState, unit: Unit): string | null {
  if (unit.type !== "settler") return "Only Settlers can found cities.";
  if (unit.movesLeft <= 0) return "This Settler has no moves left.";
  if (cityAt(s, unit.x, unit.y)) return "There is already a city here.";
  if (citiesOf(s, unit.owner).length >= cityLimit(s, unit.owner)) return "You have reached your city limit.";
  return null;
}

export function improvementProblem(s: GameState, unit: Unit, improvement: ImprovementId): string | null {
  if (unit.type !== "worker") return "Only Workers can build improvements.";
  if (unit.movesLeft <= 0 || unit.task) return "This Worker is busy.";
  if (!hasTech(s, unit.owner, IMPROVEMENTS[improvement].requiresTech)) return "You need the required tech first.";
  const tile = getTile(s, unit.x, unit.y);
  if (!tile || tile.owner !== unit.owner) return "Improvements can only be built in your territory.";
  if (cityAt(s, unit.x, unit.y)) return "Cannot build an improvement on a city.";
  if (tile.improvement) return "This tile already has an improvement.";
  return null;
}

// ---------- visibility ----------

export function visibleTiles(s: GameState, pid: PlayerId): boolean[] {
  const vis = new Array<boolean>(s.width * s.height).fill(false);
  const sources: Point[] = [...unitsOf(s, pid), ...citiesOf(s, pid)];
  for (const src of sources) {
    for (const p of pointsInRadius(s, src.x, src.y, RULES.visionRadius)) vis[tileIndex(s, p.x, p.y)] = true;
  }
  return vis;
}

// ---------- score ----------

export interface ScoreBreakdown {
  cities: number;
  population: number;
  techs: number;
  territory: number;
  buildings: number;
  total: number;
}

export function computeScore(s: GameState, pid: PlayerId): ScoreBreakdown {
  const p = getPlayer(s, pid);
  const cities = citiesOf(s, pid);
  const sc = RULES.score;
  const cityPts = cities.length * sc.perCity;
  const popPts = cities.reduce((n, c) => n + c.population, 0) * sc.perPopulation;
  const techPts = p.techs.length * sc.perTech;
  const territoryPts = s.tiles.filter((t) => t.owner === pid).length * sc.perTile;
  const total = cityPts + popPts + techPts + territoryPts + p.bonusScore;
  return { cities: cityPts, population: popPts, techs: techPts, territory: territoryPts, buildings: p.bonusScore, total };
}

/** Ranking used for the score victory: score, then techs, then cities, then player order. */
export function rankPlayers(s: GameState): PlayerId[] {
  return s.players
    .filter((p) => p.alive)
    .map((p) => ({ id: p.id, score: computeScore(s, p.id).total, techs: p.techs.length, cities: citiesOf(s, p.id).length }))
    .sort((a, b) => b.score - a.score || b.techs - a.techs || b.cities - a.cities || a.id - b.id)
    .map((e) => e.id);
}

// ---------- turn flow helpers ----------

export function needsOrders(u: Unit): boolean {
  return u.movesLeft > 0 && !u.skipped && !u.task;
}

/** Units that still have something to do this turn, in a stable order for cycling through. */
export function unitsNeedingOrders(s: GameState, pid: PlayerId): Unit[] {
  return unitsOf(s, pid).filter(needsOrders).sort((a, b) => a.id - b.id);
}

/** The next unit that still has something to do this turn, for auto-selection. */
export function nextUnitNeedingOrders(s: GameState, pid: PlayerId, afterId?: number): Unit | null {
  const ready = unitsNeedingOrders(s, pid);
  if (ready.length === 0) return null;
  if (afterId === undefined) return ready[0] ?? null;
  return ready.find((u) => u.id > afterId) ?? ready[0] ?? null;
}

export function citiesWithoutProduction(s: GameState, pid: PlayerId): City[] {
  return citiesOf(s, pid).filter((c) => c.current === null);
}

