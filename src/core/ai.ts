import type { BuildingId } from "../data/buildings";
import { RULES } from "../data/config";
import { TECH_BY_ID, type TechId } from "../data/techs";
import { UNITS, type UnitTypeId } from "../data/units";
import { distance, neighbors, pointsInRadius, tileIndex, type Point } from "./grid";
import {
  attackTargets,
  availableTechs,
  canBuildBuilding,
  canBuildUnit,
  cityAt,
  cityLimit,
  citiesOf,
  combatPreview,
  foundCityProblem,
  getPlayer,
  getTile,
  getUnit,
  hasTech,
  improvementProblem,
  isPassable,
  reachableTiles,
  tileYields,
  unitAt,
  unitsOf,
  visibleTiles,
} from "./queries";
import { Rng } from "./rng";
import { attack, buildImprovement, foundCity, moveUnit, setProduction, setResearch } from "./rules";
import type { BuildItem, City, GameState, PlayerId, Unit } from "./state";

const MIN_CITY_SPACING = 3;
const THREAT_RADIUS = 3;
const SETTLER_SEARCH_RADIUS = 7;
const LAST_SETTLER_TURN = 20;

interface TurnContext {
  pid: PlayerId;
  rng: Rng;
  threatened: boolean;
  /** Enemy city the army marches on this turn, or null when defending. */
  warTarget: Point | null;
  /** Unit id → city it should garrison. */
  garrisonOrders: Map<number, Point>;
  /** Cached BFS path distances keyed by target tile index. */
  pathCache: Map<number, Int16Array>;
}

export function runAiTurn(state: GameState, pid: PlayerId): GameState {
  if (state.phase !== "playing" || !getPlayer(state, pid).alive) return state;
  const rng = new Rng(state.rng);
  let s = state;
  const ctx: TurnContext = {
    pid,
    rng,
    threatened: isThreatened(s, pid),
    warTarget: null,
    garrisonOrders: new Map(),
    pathCache: new Map(),
  };
  ctx.warTarget = chooseWarTarget(s, ctx);
  ctx.garrisonOrders = assignGarrisons(s, pid);

  s = chooseResearch(s, ctx);
  s = manageProduction(s, ctx);
  for (const id of unitsOf(s, pid).map((u) => u.id)) {
    if (s.phase !== "playing") break;
    s = actWithUnit(s, ctx, id);
  }
  return { ...s, rng: rng.state };
}

// ---------- strategic assessment ----------

function isMilitary(u: Unit): boolean {
  return UNITS[u.type].attack !== "none";
}

function militaryStrength(s: GameState, pid: PlayerId): number {
  return unitsOf(s, pid).filter(isMilitary).reduce((n, u) => n + UNITS[u.type].strength, 0);
}

function isThreatened(s: GameState, pid: PlayerId): boolean {
  const visible = visibleTiles(s, pid);
  const cities = citiesOf(s, pid);
  return s.units.some(
    (u) =>
      u.owner !== pid &&
      isMilitary(u) &&
      visible[tileIndex(s, u.x, u.y)] &&
      cities.some((c) => distance(c, u) <= THREAT_RADIUS),
  );
}

/** Weakest living rival by military strength, attacked only with a clear edge. Uses full map knowledge to keep the AI simple. */
function chooseWarTarget(s: GameState, ctx: TurnContext): Point | null {
  if (s.difficulty === "easy" && s.turn < RULES.easy.aiNoAttackBeforeTurn - 2) return null;
  const ours = militaryStrength(s, ctx.pid);
  const armySize = unitsOf(s, ctx.pid).filter(isMilitary).length;
  const myCities = citiesOf(s, ctx.pid);
  if (armySize < myCities.length + 2 || myCities.length === 0) return null;

  const rivals = s.players
    .filter((p) => p.alive && p.id !== ctx.pid && citiesOf(s, p.id).length > 0)
    .map((p) => ({ id: p.id, strength: militaryStrength(s, p.id) }))
    .sort((a, b) => a.strength - b.strength || a.id - b.id);
  const weakest = rivals[0];
  if (!weakest || ours < weakest.strength * 1.3 + 5) return null;

  const home = myCities.find((c) => c.isCapital) ?? myCities[0];
  if (!home) return null;
  const targets = citiesOf(s, weakest.id).sort((a, b) => distance(home, a) - distance(home, b));
  return targets[0] ? { x: targets[0].x, y: targets[0].y } : null;
}

function hasGarrison(s: GameState, city: City): boolean {
  const u = unitAt(s, city.x, city.y);
  return u !== undefined && u.owner === city.owner && isMilitary(u);
}

function assignGarrisons(s: GameState, pid: PlayerId): Map<number, Point> {
  const orders = new Map<number, Point>();
  const free = unitsOf(s, pid).filter((u) => isMilitary(u) && !cityAt(s, u.x, u.y));
  for (const city of citiesOf(s, pid)) {
    if (hasGarrison(s, city)) continue;
    free.sort((a, b) => distance(a, city) - distance(b, city));
    const unit = free.shift();
    if (unit) orders.set(unit.id, { x: city.x, y: city.y });
  }
  return orders;
}

// ---------- research ----------

function chooseResearch(s: GameState, ctx: TurnContext): GameState {
  if (getPlayer(s, ctx.pid).researching) return s;
  const options = availableTechs(s, ctx.pid);
  if (options.length === 0) return s;
  const preferred = ctx.threatened || ctx.warTarget ? "military" : "economy";
  const score = (t: TechId): number => {
    const tech = TECH_BY_ID[t];
    const branchPenalty = tech.branch === preferred ? 0 : tech.branch === "science" ? 6 : 12;
    return tech.cost + branchPenalty + ctx.rng.next() * 8;
  };
  const ranked = options.map((t) => ({ t, v: score(t) })).sort((a, b) => a.v - b.v);
  const pick = ranked[0];
  return pick ? setResearch(s, ctx.pid, pick.t) : s;
}

// ---------- production ----------

function bestMilitaryUnit(s: GameState, ctx: TurnContext): UnitTypeId {
  const pid = ctx.pid;
  if (canBuildUnit(s, pid, "archer") && ctx.rng.next() < 0.3) return "archer";
  const melee: UnitTypeId[] = ["swordsman", "horseman", "warrior"];
  return melee.find((u) => canBuildUnit(s, pid, u)) ?? "warrior";
}

const BUILDING_PRIORITY: BuildingId[] = ["library", "granary", "workshop", "temple", "university", "walls"];

function chooseBuilding(s: GameState, city: City, ctx: TurnContext): BuildingId | null {
  if (ctx.threatened && canBuildBuilding(s, city, "walls")) return "walls";
  return BUILDING_PRIORITY.find((b) => b !== "walls" && canBuildBuilding(s, city, b)) ?? null;
}

function chooseProduction(s: GameState, city: City, ctx: TurnContext, queued: { settlers: number; military: number; workers: number }): BuildItem {
  const pid = ctx.pid;
  const units = unitsOf(s, pid);
  const cities = citiesOf(s, pid);
  const military = units.filter(isMilitary).length + queued.military;
  const settlers = units.filter((u) => u.type === "settler").length + queued.settlers;
  const workers = units.filter((u) => u.type === "worker").length + queued.workers;

  if (military < cities.length || (ctx.threatened && !hasGarrison(s, city))) {
    return { kind: "unit", id: bestMilitaryUnit(s, ctx) };
  }
  if (cities.length + settlers < cityLimit(s, pid) && settlers < 1 && s.turn <= LAST_SETTLER_TURN) {
    return { kind: "unit", id: "settler" };
  }
  if (ctx.threatened && military < cities.length * 2 + 1) {
    return { kind: "unit", id: bestMilitaryUnit(s, ctx) };
  }
  const canImprove = hasTech(s, pid, "agriculture") || hasTech(s, pid, "mining");
  if (canImprove && workers < Math.ceil(cities.length / 2)) return { kind: "unit", id: "worker" };

  const wantsArmy = s.turn >= 10 && military < cities.length * 2 + 2;
  if (wantsArmy && ctx.rng.next() < 0.5) return { kind: "unit", id: bestMilitaryUnit(s, ctx) };
  const building = chooseBuilding(s, city, ctx);
  if (building) return { kind: "building", id: building };
  return { kind: "unit", id: bestMilitaryUnit(s, ctx) };
}

function sameItem(a: BuildItem | null, b: BuildItem): boolean {
  return a !== null && a.kind === b.kind && a.id === b.id;
}

function manageProduction(s: GameState, ctx: TurnContext): GameState {
  const queued = { settlers: 0, military: 0, workers: 0 };
  for (const cityId of citiesOf(s, ctx.pid).map((c) => c.id)) {
    const city = s.cities.find((c) => c.id === cityId);
    if (!city) continue;
    // Keep a building in progress so the pool isn't spent on something else halfway.
    const keep = city.current?.kind === "building" && city.production > 0 && canBuildBuilding(s, city, city.current.id);
    const item = keep && city.current ? city.current : chooseProduction(s, city, ctx, queued);
    if (item.kind === "unit") {
      if (item.id === "settler") queued.settlers++;
      else if (item.id === "worker") queued.workers++;
      else queued.military++;
    }
    if (!sameItem(city.current, item)) s = setProduction(s, city.id, item);
  }
  return s;
}

// ---------- movement helpers ----------

/** BFS distance to `target` over passable terrain, ignoring units (they move). */
function pathDistances(s: GameState, ctx: TurnContext, target: Point): Int16Array {
  const key = tileIndex(s, target.x, target.y);
  const cached = ctx.pathCache.get(key);
  if (cached) return cached;
  const dist = new Int16Array(s.width * s.height).fill(-1);
  dist[key] = 0;
  const queue: Point[] = [target];
  while (queue.length > 0) {
    const p = queue.shift() as Point;
    const d = dist[tileIndex(s, p.x, p.y)] ?? 0;
    for (const n of neighbors(s, p.x, p.y)) {
      const i = tileIndex(s, n.x, n.y);
      if (dist[i] !== -1 || !isPassable(s, n.x, n.y)) continue;
      dist[i] = d + 1;
      queue.push(n);
    }
  }
  ctx.pathCache.set(key, dist);
  return dist;
}

function moveToward(s: GameState, ctx: TurnContext, unit: Unit, target: Point): GameState {
  const dist = pathDistances(s, ctx, target);
  const d = (p: Point): number => {
    const v = dist[tileIndex(s, p.x, p.y)] ?? -1;
    return v < 0 ? 999 : v;
  };
  const here = d(unit);
  let best: { p: Point; v: number; cost: number } | null = null;
  for (const r of reachableTiles(s, unit)) {
    const v = d(r);
    if (v < here && (!best || v < best.v || (v === best.v && r.cost < best.cost))) best = { p: r, v, cost: r.cost };
  }
  return best ? moveUnit(s, unit.id, best.p) : s;
}

// ---------- unit behaviour ----------

function actWithUnit(s: GameState, ctx: TurnContext, unitId: number): GameState {
  const unit = getUnit(s, unitId);
  if (!unit || unit.movesLeft <= 0 || unit.task) return s;
  switch (unit.type) {
    case "settler":
      return actSettler(s, ctx, unit);
    case "worker":
      return actWorker(s, ctx, unit);
    default:
      return actMilitary(s, ctx, unitId);
  }
}

function siteScore(s: GameState, p: Point): number {
  let score = 0;
  for (const q of pointsInRadius(s, p.x, p.y, 1)) {
    const y = tileYields(s, q.x, q.y);
    score += y.food * 1.3 + y.production;
    if (getTile(s, q.x, q.y)?.river) score += 0.5;
  }
  return score;
}

function isValidSite(s: GameState, pid: PlayerId, p: Point): boolean {
  if (!isPassable(s, p.x, p.y) || cityAt(s, p.x, p.y)) return false;
  const owner = getTile(s, p.x, p.y)?.owner;
  if (owner !== null && owner !== undefined && owner !== pid) return false;
  return s.cities.every((c) => distance(c, p) >= MIN_CITY_SPACING);
}

function actSettler(s: GameState, ctx: TurnContext, unit: Unit): GameState {
  if (foundCityProblem(s, unit) === "You have reached your city limit.") return s;
  // First city: settle on the spot so the capital starts producing immediately.
  if (citiesOf(s, ctx.pid).length === 0) {
    return foundCityProblem(s, unit) ? s : foundCity(s, unit.id);
  }
  let best: { p: Point; v: number } | null = null;
  for (const p of pointsInRadius(s, unit.x, unit.y, SETTLER_SEARCH_RADIUS)) {
    if (!isValidSite(s, ctx.pid, p)) continue;
    const occupant = unitAt(s, p.x, p.y);
    if (occupant && occupant.id !== unit.id) continue;
    const v = siteScore(s, p) - distance(unit, p) * 0.8 + ctx.rng.next() * 0.1;
    if (!best || v > best.v) best = { p, v };
  }
  if (!best) return s;
  if (best.p.x === unit.x && best.p.y === unit.y) {
    return foundCityProblem(s, unit) ? s : foundCity(s, unit.id);
  }
  const moved = moveToward(s, ctx, unit, best.p);
  const after = getUnit(moved, unit.id);
  if (after && after.x === best.p.x && after.y === best.p.y && !foundCityProblem(moved, after)) {
    return foundCity(moved, after.id);
  }
  return moved;
}

function improvementFor(s: GameState, unit: Unit): "farm" | "mine" | null {
  const tile = getTile(s, unit.x, unit.y);
  if (!tile) return null;
  const prefersMine = tile.terrain === "hills" || (tile.terrain === "forest" && !tile.river);
  const order: ("farm" | "mine")[] = prefersMine ? ["mine", "farm"] : ["farm", "mine"];
  return order.find((imp) => improvementProblem(s, unit, imp) === null) ?? null;
}

function actWorker(s: GameState, ctx: TurnContext, unit: Unit): GameState {
  const here = improvementFor(s, unit);
  if (here) return buildImprovement(s, unit.id, here);

  let best: { p: Point; d: number } | null = null;
  s.tiles.forEach((t, i) => {
    if (t.owner !== ctx.pid || t.improvement || t.cityId === null) return;
    const p = { x: i % s.width, y: Math.floor(i / s.width) };
    if (!isPassable(s, p.x, p.y) || cityAt(s, p.x, p.y)) return;
    const occupant = unitAt(s, p.x, p.y);
    if (occupant && occupant.id !== unit.id) return;
    const d = distance(unit, p);
    if (!best || d < best.d) best = { p, d };
  });
  if (!best) return s;
  const target: Point = (best as { p: Point }).p;
  const moved = moveToward(s, ctx, unit, target);
  const after = getUnit(moved, unit.id);
  if (after && after.movesLeft > 0) {
    const imp = improvementFor(moved, after);
    if (imp) return buildImprovement(moved, after.id, imp);
  }
  return moved;
}

function tryAttack(s: GameState, unit: Unit): GameState | null {
  const options = attackTargets(s, unit)
    .map((p) => ({ p, preview: combatPreview(s, unit, p), city: cityAt(s, p.x, p.y) }))
    .filter((o) => o.preview.attackerWins);
  if (options.length === 0) return null;
  options.sort((a, b) => Number(Boolean(b.city)) - Number(Boolean(a.city)) || b.preview.defense - a.preview.defense);
  const pick = options[0];
  return pick ? attack(s, unit.id, pick.p).state : null;
}

function nearestEnemyNearOurCities(s: GameState, ctx: TurnContext, unit: Unit): Point | null {
  const cities = citiesOf(s, ctx.pid);
  const visible = visibleTiles(s, ctx.pid);
  let best: { p: Point; d: number } | null = null;
  for (const e of s.units) {
    if (e.owner === ctx.pid || !UNITS[e.type].canBeAttacked) continue;
    if (!visible[tileIndex(s, e.x, e.y)]) continue;
    if (!cities.some((c) => distance(c, e) <= THREAT_RADIUS)) continue;
    if (UNITS[e.type].strength >= UNITS[unit.type].strength + RULES.flankingBonus) continue;
    const d = distance(unit, e);
    if (!best || d < best.d) best = { p: { x: e.x, y: e.y }, d };
  }
  return best?.p ?? null;
}

function actMilitary(s: GameState, ctx: TurnContext, unitId: number): GameState {
  let unit = getUnit(s, unitId);
  if (!unit) return s;

  const first = tryAttack(s, unit);
  if (first) return first;

  const garrisonTarget = ctx.garrisonOrders.get(unitId);
  const onOwnCity = cityAt(s, unit.x, unit.y)?.owner === ctx.pid;
  let target: Point | null;
  if (garrisonTarget) target = garrisonTarget;
  else if (onOwnCity) return s; // one unit per tile, so a unit on its own city is the garrison
  else target = nearestEnemyNearOurCities(s, ctx, unit) ?? ctx.warTarget ?? homeRallyPoint(s, ctx, unit);

  if (!target || (target.x === unit.x && target.y === unit.y)) return s;
  s = moveToward(s, ctx, unit, target);
  unit = getUnit(s, unitId);
  if (!unit) return s;
  return tryAttack(s, unit) ?? s;
}

/** Idle defenders hover within 1 tile of the nearest own city. */
function homeRallyPoint(s: GameState, ctx: TurnContext, unit: Unit): Point | null {
  const cities = citiesOf(s, ctx.pid);
  if (cities.length === 0) return null;
  const nearest = [...cities].sort((a, b) => distance(a, unit) - distance(b, unit))[0];
  if (!nearest || distance(nearest, unit) <= 1) return null;
  return { x: nearest.x, y: nearest.y };
}

