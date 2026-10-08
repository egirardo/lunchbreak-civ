import { CITY_NAMES, PLAYER_PRESETS, RULES } from "../data/config";
import { IMPROVEMENTS, type ImprovementId } from "../data/improvements";
import { STARTING_TECH_CHOICES, TECHS, TECH_BY_ID, type TechId } from "../data/techs";
import { STARTING_UNITS, UNITS, UNIT_UPGRADES, type UnitTypeId } from "../data/units";
import { neighbors, pointsInRadius, tileIndex, type Point } from "./grid";
import { generateMap } from "./map";
import {
  attackTargets,
  availableTechs,
  cityAt,
  cityYields,
  citiesOf,
  combatPreview,
  foundCityProblem,
  getCity,
  getPlayer,
  getTile,
  getUnit,
  improvementProblem,
  isItemBuildable,
  isPassable,
  itemCost,
  itemName,
  rankPlayers,
  reachableTiles,
  unitAt,
  visibleTiles,
} from "./queries";
import { Rng } from "./rng";
import {
  HUMAN_PLAYER,
  RuleError,
  STATE_VERSION,
  type BuildItem,
  type City,
  type CityFocus,
  type Difficulty,
  type EventKind,
  type GameState,
  type Player,
  type PlayerId,
  type Unit,
  type VictoryType,
  emptyStats,
} from "./state";

// ---------- helpers ----------

function clone(s: GameState): GameState {
  return structuredClone(s);
}

function requireUnit(s: GameState, unitId: number, pid?: PlayerId): Unit {
  const u = getUnit(s, unitId);
  if (!u) throw new RuleError(`No unit ${unitId}`);
  if (pid !== undefined && u.owner !== pid) throw new RuleError("That unit is not yours.");
  return u;
}

function requireCity(s: GameState, cityId: number): City {
  const c = getCity(s, cityId);
  if (!c) throw new RuleError(`No city ${cityId}`);
  return c;
}

function requirePlaying(s: GameState): void {
  if (s.phase !== "playing") throw new RuleError("The game is not in progress.");
}

function addEvent(s: GameState, kind: EventKind, message: string, involves: PlayerId[], at?: Point): void {
  s.events.push({ turn: s.turn, kind, message, involves, ...(at ? { x: at.x, y: at.y } : {}) });
  if (s.events.length > RULES.maxStoredEvents) s.events.splice(0, s.events.length - RULES.maxStoredEvents);
}

function updateExplored(s: GameState): void {
  for (const p of s.players) {
    if (!p.alive) continue;
    const vis = visibleTiles(s, p.id);
    vis.forEach((v, i) => {
      if (v) p.explored[i] = true;
    });
  }
}

function spawnUnit(s: GameState, type: UnitTypeId, owner: PlayerId, at: Point): Unit {
  const unit: Unit = {
    id: s.nextId++,
    type,
    owner,
    x: at.x,
    y: at.y,
    movesLeft: UNITS[type].moves,
    hasAttacked: false,
    skipped: false,
    task: null,
  };
  s.units.push(unit);
  return unit;
}

function freeTileNear(s: GameState, at: Point): Point | null {
  const candidates = [at, ...neighbors(s, at.x, at.y)];
  return candidates.find((p) => isPassable(s, p.x, p.y) && !unitAt(s, p.x, p.y) && (!cityAt(s, p.x, p.y) || (p.x === at.x && p.y === at.y))) ?? null;
}

function claimTiles(s: GameState, city: City, radius: number): void {
  for (const p of pointsInRadius(s, city.x, city.y, radius)) {
    const t = s.tiles[tileIndex(s, p.x, p.y)];
    if (t && t.owner === null) {
      t.owner = city.owner;
      t.cityId = city.id;
    }
  }
}

function claimRadiusFor(city: City): number {
  return city.population >= RULES.expandClaimAtPopulation ? RULES.expandedClaimRadius : RULES.claimRadius;
}

function nextCityName(player: Player): string {
  const names = CITY_NAMES[player.id] ?? [];
  const name = names[player.citiesFounded] ?? `${player.name} ${player.citiesFounded + 1}`;
  player.citiesFounded++;
  return name;
}

function grantTech(s: GameState, pid: PlayerId, tech: TechId): void {
  const p = getPlayer(s, pid);
  if (p.techs.includes(tech)) return;
  p.techs.push(tech);
  if (p.researching === tech) p.researching = null;
  if (TECH_BY_ID[tech].unlocks.effects?.includes("upgradeWarriors")) {
    for (const u of s.units) {
      const to = UNIT_UPGRADES[u.type];
      if (u.owner === pid && to) u.type = to;
    }
    for (const c of citiesOf(s, pid)) {
      if (c.current?.kind === "unit") {
        const to = UNIT_UPGRADES[c.current.id];
        if (to) c.current = { kind: "unit", id: to };
      }
    }
  }
}

// ---------- game setup ----------

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
}

export function newGame({ seed, difficulty }: NewGameOptions): GameState {
  const rng = new Rng(seed);
  const size = { width: RULES.mapWidth, height: RULES.mapHeight };
  const { tiles, starts } = generateMap(rng, size, RULES.playerCount);

  const players: Player[] = starts.map((_, id) => {
    const preset = PLAYER_PRESETS[id] ?? PLAYER_PRESETS[0];
    return {
      id,
      name: preset.name,
      color: preset.color,
      pattern: preset.pattern,
      isHuman: id === HUMAN_PLAYER,
      alive: true,
      science: 0,
      researching: null,
      techs: [],
      culture: 0,
      bonusScore: 0,
      explored: new Array<boolean>(size.width * size.height).fill(false),
      citiesFounded: 0,
      stats: emptyStats(),
    };
  });

  const s: GameState = {
    version: STATE_VERSION,
    seed,
    rng: 0,
    turn: 1,
    maxTurns: RULES.maxTurns,
    width: size.width,
    height: size.height,
    difficulty,
    tiles,
    units: [],
    cities: [],
    players,
    nextId: 1,
    phase: "chooseTech",
    winner: null,
    victory: null,
    events: [],
  };

  starts.forEach((start, pid) => {
    for (const type of STARTING_UNITS) {
      const spot = freeTileNear(s, start);
      if (spot) spawnUnit(s, type, pid, spot);
    }
  });

  for (const p of players) {
    if (!p.isHuman) grantTech(s, p.id, rng.pick(STARTING_TECH_CHOICES));
  }
  s.rng = rng.state;
  updateExplored(s);
  return s;
}

export function chooseStartingTech(state: GameState, tech: TechId): GameState {
  if (state.phase !== "chooseTech") throw new RuleError("The starting tech has already been chosen.");
  if (!STARTING_TECH_CHOICES.includes(tech)) throw new RuleError("That is not a starting tech option.");
  const s = clone(state);
  grantTech(s, HUMAN_PLAYER, tech);
  s.phase = "playing";
  return s;
}

// ---------- player actions ----------

export function setResearch(state: GameState, pid: PlayerId, tech: TechId): GameState {
  if (!availableTechs(state, pid).includes(tech)) throw new RuleError("That tech is not available yet.");
  const s = clone(state);
  getPlayer(s, pid).researching = tech;
  return s;
}

export function setProduction(state: GameState, cityId: number, item: BuildItem): GameState {
  const city = requireCity(state, cityId);
  if (!isItemBuildable(state, city, item)) throw new RuleError("That can't be built here.");
  const s = clone(state);
  requireCity(s, cityId).current = item;
  return s;
}

export function setFocus(state: GameState, cityId: number, focus: CityFocus): GameState {
  const city = requireCity(state, cityId);
  if (focus === "science" && !city.buildings.includes("library")) {
    throw new RuleError("Science Focus needs a Library in this city.");
  }
  const s = clone(state);
  requireCity(s, cityId).focus = focus;
  return s;
}

export function moveUnit(state: GameState, unitId: number, to: Point): GameState {
  requirePlaying(state);
  const unit = requireUnit(state, unitId);
  const dest = reachableTiles(state, unit).find((r) => r.x === to.x && r.y === to.y);
  if (!dest) throw new RuleError("That unit can't reach there this turn.");
  const s = clone(state);
  const u = requireUnit(s, unitId);
  u.x = dest.x;
  u.y = dest.y;
  u.movesLeft -= dest.cost;
  updateExplored(s);
  return s;
}

export function skipUnit(state: GameState, unitId: number): GameState {
  const s = clone(state);
  requireUnit(s, unitId).skipped = true;
  return s;
}

export function foundCity(state: GameState, unitId: number): GameState {
  requirePlaying(state);
  const unit = requireUnit(state, unitId);
  const problem = foundCityProblem(state, unit);
  if (problem) throw new RuleError(problem);

  const s = clone(state);
  const u = requireUnit(s, unitId);
  const owner = getPlayer(s, u.owner);
  const isCapital = !s.cities.some((c) => c.owner === u.owner && c.isCapital);
  const city: City = {
    id: s.nextId++,
    name: nextCityName(owner),
    owner: u.owner,
    x: u.x,
    y: u.y,
    population: 1,
    food: 0,
    production: 0,
    current: null,
    buildings: [],
    focus: "balanced",
    isCapital,
    foundedTurn: s.turn,
  };
  s.cities.push(city);
  s.units = s.units.filter((x) => x.id !== unitId);

  // The founding tile always belongs to the new city, even inside someone else's borders.
  const centre = getTile(s, city.x, city.y);
  if (centre) {
    centre.owner = city.owner;
    centre.cityId = city.id;
  }
  claimTiles(s, city, RULES.claimRadius);
  addEvent(s, "cityFounded", `${owner.name} founded ${city.name}.`, [city.owner], city);
  updateExplored(s);
  return s;
}

export function buildImprovement(state: GameState, unitId: number, improvement: ImprovementId): GameState {
  requirePlaying(state);
  const unit = requireUnit(state, unitId);
  const problem = improvementProblem(state, unit, improvement);
  if (problem) throw new RuleError(problem);
  const s = clone(state);
  const u = requireUnit(s, unitId);
  u.task = { kind: "improve", improvement };
  u.movesLeft = 0;
  return s;
}

export interface AttackResult {
  state: GameState;
  attackerWon: boolean;
  attack: number;
  defense: number;
  capturedCityId: number | null;
}

export function attack(state: GameState, unitId: number, target: Point): AttackResult {
  requirePlaying(state);
  const attacker = requireUnit(state, unitId);
  if (!attackTargets(state, attacker).some((p) => p.x === target.x && p.y === target.y)) {
    throw new RuleError("That unit can't attack there.");
  }
  const preview = combatPreview(state, attacker, target);
  const s = clone(state);
  const a = requireUnit(s, unitId);
  const defenderUnit = unitAt(s, target.x, target.y);
  const city = cityAt(s, target.x, target.y);
  const defenderOwner = city?.owner ?? defenderUnit?.owner ?? null;
  const ranged = UNITS[a.type].attack === "ranged";
  const attackerName = getPlayer(s, a.owner).name;
  const defenderName = defenderOwner !== null ? getPlayer(s, defenderOwner).name : "the enemy";
  const involves = defenderOwner !== null ? [a.owner, defenderOwner] : [a.owner];
  let capturedCityId: number | null = null;

  a.movesLeft = 0;
  a.hasAttacked = true;
  recordBattle(s, a.owner, defenderOwner, preview.attackerWins, {
    attackerLostUnit: !preview.attackerWins && !ranged,
    defenderLostUnit: preview.attackerWins && defenderUnit !== undefined,
  });

  if (preview.attackerWins) {
    if (defenderUnit) s.units = s.units.filter((u) => u.id !== defenderUnit.id);
    if (city && !ranged) {
      a.x = city.x;
      a.y = city.y;
      capturedCityId = city.id;
      captureCity(s, city, a.owner);
    } else {
      const what = defenderUnit ? UNITS[defenderUnit.type].name : `the garrison of ${city?.name ?? "the city"}`;
      addEvent(s, "combat", `${attackerName}'s ${UNITS[a.type].name} defeated ${defenderName}'s ${what} (${preview.attack} vs ${preview.defense}).`, involves, target);
    }
  } else if (ranged) {
    addEvent(s, "combat", `${attackerName}'s Archer attack failed (${preview.attack} vs ${preview.defense}).`, involves, target);
  } else {
    s.units = s.units.filter((u) => u.id !== a.id);
    addEvent(s, "combat", `${attackerName}'s ${UNITS[a.type].name} was defeated attacking ${defenderName} (${preview.attack} vs ${preview.defense}).`, involves, target);
  }

  updateExplored(s);
  checkInstantVictory(s);
  return { state: s, attackerWon: preview.attackerWins, attack: preview.attack, defense: preview.defense, capturedCityId };
}

function recordBattle(
  s: GameState,
  attacker: PlayerId,
  defender: PlayerId | null,
  attackerWon: boolean,
  losses: { attackerLostUnit: boolean; defenderLostUnit: boolean },
): void {
  const a = getPlayer(s, attacker).stats;
  const d = defender !== null ? getPlayer(s, defender).stats : null;
  if (attackerWon) {
    a.battlesWon++;
    if (d) d.battlesLost++;
  } else {
    a.battlesLost++;
    if (d) d.battlesWon++;
  }
  if (losses.attackerLostUnit) a.unitsLost++;
  if (losses.defenderLostUnit && d) d.unitsLost++;
}

function captureCity(s: GameState, city: City, newOwner: PlayerId): void {
  const oldOwner = city.owner;
  const wasCapital = city.isCapital;
  const oldName = getPlayer(s, oldOwner).name;
  const newName = getPlayer(s, newOwner).name;

  city.owner = newOwner;
  city.isCapital = false;
  getPlayer(s, newOwner).stats.citiesCaptured++;
  getPlayer(s, oldOwner).stats.citiesLost++;
  if (city.current && !isItemBuildable(s, city, city.current)) city.current = null;
  for (const t of s.tiles) {
    if (t.cityId === city.id) t.owner = newOwner;
  }
  addEvent(s, "cityCaptured", `${newName} captured ${city.name} from ${oldName}!`, [newOwner, oldOwner], city);

  if (wasCapital) eliminatePlayer(s, oldOwner, newOwner);
}

function eliminatePlayer(s: GameState, pid: PlayerId, by: PlayerId): void {
  const p = getPlayer(s, pid);
  p.alive = false;
  const removed = new Set(s.cities.filter((c) => c.owner === pid).map((c) => c.id));
  s.cities = s.cities.filter((c) => c.owner !== pid);
  s.units = s.units.filter((u) => u.owner !== pid);
  for (const t of s.tiles) {
    if (t.cityId !== null && removed.has(t.cityId)) {
      t.owner = null;
      t.cityId = null;
    }
  }
  addEvent(s, "playerEliminated", `${p.name} has been eliminated by ${getPlayer(s, by).name}!`, [pid, by]);

  if (p.isHuman) endGame(s, by, "eliminated");
}

// ---------- victory ----------

function endGame(s: GameState, winner: PlayerId, victory: VictoryType): void {
  if (s.phase === "ended") return;
  s.phase = "ended";
  s.winner = winner;
  s.victory = victory;
  const labels: Record<VictoryType, string> = {
    score: "a Score Victory",
    domination: "a Domination Victory",
    science: "a Science Victory",
    culture: "a Culture Victory",
    eliminated: "conquest",
  };
  addEvent(s, "gameOver", `${getPlayer(s, winner).name} wins by ${labels[victory]}!`, s.players.map((p) => p.id));
}

function checkInstantVictory(s: GameState): void {
  if (s.phase === "ended") return;
  const alive = s.players.filter((p) => p.alive);
  if (alive.length === 1 && alive[0]) {
    endGame(s, alive[0].id, "domination");
    return;
  }
  for (const p of alive) {
    if (p.techs.length >= TECHS.length) return endGame(s, p.id, "science");
  }
  for (const p of alive) {
    if (p.culture >= RULES.cultureVictoryThreshold) return endGame(s, p.id, "culture");
  }
}

// ---------- end of round ----------

function processCity(s: GameState, city: City): void {
  const y = cityYields(s, city);
  const owner = getPlayer(s, city.owner);

  if (city.population < RULES.maxPopulation) {
    city.food += y.food;
    if (city.food >= RULES.foodToGrow) {
      city.food = 0;
      city.population++;
      claimTiles(s, city, claimRadiusFor(city));
      addEvent(s, "cityGrew", `${city.name} grew to population ${city.population}.`, [city.owner], city);
    }
  }

  if (city.current && !isItemBuildable(s, city, city.current)) city.current = null;
  if (city.current) {
    city.production += y.production;
    const cost = itemCost(city.current);
    if (city.production >= cost) {
      const item = city.current;
      let built = true;
      if (item.kind === "unit") {
        const spot = freeTileNear(s, city);
        if (spot) {
          spawnUnit(s, item.id, city.owner, spot);
          owner.stats.unitsBuilt++;
        } else built = false; // no room: hold the production until a tile frees up
      } else {
        city.buildings.push(item.id);
        owner.stats.buildingsBuilt++;
      }
      if (built) {
        city.production -= cost;
        if (item.kind === "building") city.current = null;
        addEvent(s, "built", `${city.name} built ${itemName(item)}.`, [city.owner], city);
      }
    }
  }

  owner.culture += y.culture;
  owner.bonusScore += y.scorePerTurn;
}

/** Announce to everyone when a player passes halfway to a culture victory, so rivals can react. */
function warnOfCultureLeaders(s: GameState, before: number[]): void {
  const half = RULES.cultureVictoryThreshold / 2;
  for (const p of s.players) {
    if (!p.alive || (before[p.id] ?? 0) >= half || p.culture < half) continue;
    addEvent(s, "cultureWarning", `${p.name} is halfway to a Culture Victory (${p.culture}/${RULES.cultureVictoryThreshold})!`, s.players.map((x) => x.id));
  }
}

function processResearch(s: GameState, p: Player): void {
  const science = citiesOf(s, p.id).reduce((n, c) => n + cityYields(s, c).science, 0);
  p.science += science;
  if (!p.researching) return;
  const tech = TECH_BY_ID[p.researching];
  if (p.science >= tech.cost) {
    p.science = 0;
    grantTech(s, p.id, tech.id);
    addEvent(s, "techResearched", `${p.name} discovered ${tech.name}.`, [p.id]);
  }
}

function completeWorkerTasks(s: GameState): void {
  for (const u of s.units) {
    if (!u.task) continue;
    const tile = getTile(s, u.x, u.y);
    if (tile && !tile.improvement) {
      tile.improvement = u.task.improvement;
      addEvent(s, "improvementBuilt", `A ${IMPROVEMENTS[u.task.improvement].name} was built.`, [u.owner], u);
    }
    u.task = null;
  }
}

/**
 * Resolves yields for every player and advances the turn. Call once all players have acted.
 * Instant victories are checked as they happen; the score victory is decided after the last turn.
 */
export function processEndOfRound(state: GameState): GameState {
  requirePlaying(state);
  const s = clone(state);

  completeWorkerTasks(s);
  const cultureBefore = s.players.map((p) => p.culture);
  for (const city of [...s.cities]) processCity(s, city);
  warnOfCultureLeaders(s, cultureBefore);
  for (const p of s.players) if (p.alive) processResearch(s, p);
  checkInstantVictory(s);

  if (s.phase === "playing" && s.turn >= s.maxTurns) {
    const [winner] = rankPlayers(s);
    if (winner !== undefined) endGame(s, winner, "score");
  }

  if (s.phase === "playing") {
    s.turn++;
    for (const u of s.units) {
      u.movesLeft = u.task ? 0 : UNITS[u.type].moves;
      u.hasAttacked = false;
      u.skipped = false;
    }
  }
  updateExplored(s);
  return s;
}

