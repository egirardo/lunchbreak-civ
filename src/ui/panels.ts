import { BUILDINGS } from "../data/buildings";
import { RULES } from "../data/config";
import { IMPROVEMENTS, type ImprovementId } from "../data/improvements";
import { STARTING_TECH_CHOICES, TECHS, TECH_BY_ID, type Tech } from "../data/techs";
import { TERRAIN } from "../data/terrain";
import { UNITS } from "../data/units";
import {
  availableTechs,
  buildableItems,
  cityAt,
  cityYields,
  citiesOf,
  citiesWithoutProduction,
  combatPreview,
  computeScore,
  foundCityProblem,
  getCity,
  getPlayer,
  getTile,
  getUnit,
  hasTech,
  improvementProblem,
  itemCost,
  itemName,
  playerSciencePerTurn,
  tileYields,
  unitAt,
} from "../core/queries";
import { HUMAN_PLAYER, type BuildItem, type City, type CityFocus, type GameEvent, type GameState, type Unit, type VictoryType } from "../core/state";
import { isMusicEnabled, isMuted } from "./audio";
import { esc, plural, turnsLabel, turnsToComplete } from "./format";
import { BUILDING_GLYPH, ICON, UNIT_GLYPH, icon, sprite } from "./glyphs";
import { renderMarkdown } from "./markdown";
import { ownerBadge } from "./mapView";
import type { UiState } from "./uiState";
import howToPlay from "../../docs/how-to-play.md?raw";

function btn(action: string, label: string, opts: { data?: Record<string, string | number>; cls?: string; title?: string; label?: string; disabled?: boolean; pressed?: boolean; key?: string } = {}): string {
  const data = Object.entries(opts.data ?? {})
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join("");
  const focusKey = [action, ...Object.values(opts.data ?? {})].join(":");
  const attrs = [
    `type="button"`,
    `data-action="${action}"`,
    `data-focus-key="${esc(focusKey)}"`,
    opts.cls ? `class="${opts.cls}"` : "",
    opts.title ? `title="${esc(opts.title)}"` : "",
    opts.label ? `aria-label="${esc(opts.label)}"` : "",
    opts.disabled ? "disabled" : "",
    opts.pressed !== undefined ? `aria-pressed="${opts.pressed}"` : "",
    opts.key ? `aria-keyshortcuts="${esc(opts.key)}"` : "",
  ].filter(Boolean);
  return `<button ${attrs.join(" ")}${data}>${label}</button>`;
}

function kbd(key: string): string {
  return ` <kbd>${esc(key)}</kbd>`;
}

function bar(value: number, max: number, label: string): string {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return `<div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${Math.min(value, max)}" aria-label="${esc(label)}"><div class="bar-fill" style="width:${pct}%"></div></div>`;
}

// ---------- top bar ----------

export function renderTopbar(s: GameState, timeLeft: string): string {
  const p = getPlayer(s, HUMAN_PLAYER);
  const sci = playerSciencePerTurn(s, HUMAN_PLAYER);
  const research = p.researching ? TECH_BY_ID[p.researching] : null;
  const researchText = research
    ? `${esc(research.name)} ${p.science}/${research.cost} (${turnsLabel(turnsToComplete(research.cost - p.science, sci))})`
    : availableTechs(s, HUMAN_PLAYER).length > 0
      ? `<span class="warn">No research!</span>`
      : "All researched";
  const score = computeScore(s, HUMAN_PLAYER).total;
  return `
    <div class="tb-group">
      <h1 class="logo">Lunchbreak Civ</h1>
      <span class="stat" title="Turn"><strong>Turn ${s.turn}/${s.maxTurns}</strong></span>
      <span class="stat" title="Estimated real time left">${ICON.time} ${esc(timeLeft)}</span>
      <span class="stat" title="Science per turn and current research">${icon("ui:science", ICON.science)} +${sci} · ${researchText}</span>
      <span class="stat" title="Your score">${ICON.score} ${score}</span>
      ${p.culture > 0 ? `<span class="stat" title="Culture (${RULES.cultureVictoryThreshold} wins)">${icon("ui:culture", ICON.culture)} ${p.culture}/${RULES.cultureVictoryThreshold}</span>` : ""}
    </div>
    <div class="tb-group">
      ${btn("open-tech", `Tech${kbd("T")}`, { title: "Open the tech tree", key: "T" })}
      ${btn("open-help", `Help${kbd("?")}`, { title: "How to play", key: "?" })}
      ${btn("toggle-sound", isMuted() ? "🔇" : "🔊", { pressed: !isMuted(), title: "Sound", cls: "icon-btn", label: "Sound" })}
      ${btn("toggle-music", "♪", { pressed: isMusicEnabled(), title: "Music", cls: "icon-btn", label: "Music" })}
      ${btn("end-turn", `End Turn${kbd("Space")}`, { cls: "primary end-turn", title: "End your turn (Space)", key: "Space" })}
    </div>`;
}

// ---------- sidebar ----------

function warnings(s: GameState): string {
  const items: string[] = [];
  const p = getPlayer(s, HUMAN_PLAYER);
  if (!p.researching && availableTechs(s, HUMAN_PLAYER).length > 0) {
    items.push(`<li>No research chosen. ${btn("open-tech", "Choose tech", { cls: "link" })}</li>`);
  }
  for (const c of citiesWithoutProduction(s, HUMAN_PLAYER)) {
    items.push(`<li>${esc(c.name)} is building nothing. ${btn("open-city", "Open city", { cls: "link", data: { city: c.id } })}</li>`);
  }
  if (items.length === 0) return "";
  return `<section class="panel warnings" aria-label="Warnings"><h2>⚠ Needs attention</h2><ul>${items.join("")}</ul></section>`;
}

function unitActions(s: GameState, u: Unit): string {
  const actions: string[] = [];
  if (u.type === "settler") {
    const problem = foundCityProblem(s, u);
    actions.push(btn("found-city", `Found City${kbd("F")}`, { cls: "primary", disabled: problem !== null, title: problem ?? "Found a city on this tile", key: "F" }));
  }
  if (u.type === "worker") {
    const options: [ImprovementId, string][] = [["farm", "G"], ["mine", "M"]];
    for (const [imp, key] of options) {
      if (!hasTech(s, HUMAN_PLAYER, IMPROVEMENTS[imp].requiresTech)) continue;
      const problem = improvementProblem(s, u, imp);
      actions.push(
        btn("improve", `Build ${IMPROVEMENTS[imp].name}${kbd(key)}`, { data: { improvement: imp }, disabled: problem !== null, title: problem ?? `Build a ${IMPROVEMENTS[imp].name} here (1 turn)`, key }),
      );
    }
    if (!hasTech(s, HUMAN_PLAYER, "agriculture") && !hasTech(s, HUMAN_PLAYER, "mining")) {
      actions.push(`<p class="hint">Research Agriculture to build Farms.</p>`);
    }
  }
  const city = cityAt(s, u.x, u.y);
  if (city && city.owner === HUMAN_PLAYER) actions.push(btn("open-city", `Open ${esc(city.name)}${kbd("C")}`, { data: { city: city.id }, key: "C" }));
  actions.push(btn("skip", `Skip${kbd("S")}`, { title: "Skip this unit for the rest of the turn", key: "S" }));
  actions.push(btn("next-unit", `Next unit${kbd("N")}`, { key: "N" }));
  return `<div class="actions">${actions.join("")}</div>`;
}

function attackPanel(s: GameState, ui: UiState): string {
  const pa = ui.pendingAttack;
  if (!pa) return "";
  const attacker = getUnit(s, pa.unitId);
  if (!attacker) return "";
  const preview = combatPreview(s, attacker, pa.target);
  const target = unitAt(s, pa.target.x, pa.target.y);
  const city = cityAt(s, pa.target.x, pa.target.y);
  const name = city ? `${city.name}${city.buildings.includes("walls") ? " (walls)" : ""}` : target ? `${getPlayer(s, target.owner).name}'s ${UNITS[target.type].name}` : "target";
  const ranged = UNITS[attacker.type].attack === "ranged";
  const outcome = preview.attackerWins
    ? `<strong class="good">You will win.</strong>${city && !ranged ? " You will capture the city." : ""}`
    : `<strong class="bad">You will lose.</strong>${ranged ? " Your Archer survives." : " Your unit will be destroyed."}`;
  return `<section class="panel attack" aria-label="Attack preview">
    <h2>Attack ${esc(name)}?</h2>
    <p>${ICON.strength} You ${preview.attack}${preview.flanking ? " (incl. +1 flanking)" : ""} vs ${preview.defense}</p>
    <p>${outcome}</p>
    <div class="actions">${btn("confirm-attack", `Attack!${kbd("Enter")}`, { cls: preview.attackerWins ? "primary" : "danger" })}${btn("cancel-attack", `Cancel${kbd("Esc")}`)}</div>
  </section>`;
}

function unitPanel(s: GameState, ui: UiState): string {
  const u = ui.selectedUnitId !== null ? getUnit(s, ui.selectedUnitId) : undefined;
  if (!u || u.owner !== HUMAN_PLAYER) {
    return `<section class="panel unit-panel" aria-label="Unit"><h2>No unit selected</h2><p class="hint">${esc(ui.status || "All units have orders. Press Space to end the turn.")}</p></section>`;
  }
  const def = UNITS[u.type];
  const stats = [
    def.strength > 0 ? `${ICON.strength} ${def.strength}` : "",
    `${ICON.moves} ${u.movesLeft}/${def.moves}`,
    def.attack === "ranged" ? "Range 2" : "",
  ].filter(Boolean).join(" · ");
  return `<section class="panel unit-panel" aria-label="Selected unit">
    <h2>${sprite(`unit:${u.type}`, UNIT_GLYPH[u.type], "icon")} ${esc(def.name)}</h2>
    <p>${stats}</p>
    <p class="hint">${esc(def.description)}${def.attack !== "none" ? " Click a red tile to attack." : ""}</p>
    ${unitActions(s, u)}
    ${ui.status ? `<p class="status">${esc(ui.status)}</p>` : ""}
  </section>`;
}

const FOCUS_LABELS: Record<CityFocus, string> = { balanced: "Balanced", food: "Food", production: "Production", science: "Science" };

function buildButton(city: City, item: BuildItem, prodPerTurn: number): string {
  const cost = itemCost(item);
  const turns = turnsToComplete(cost - city.production, prodPerTurn);
  const current = city.current !== null && city.current.kind === item.kind && city.current.id === item.id;
  const glyph = item.kind === "unit" ? sprite(`unit:${item.id}`, UNIT_GLYPH[item.id], "icon") : sprite(`building:${item.id}`, BUILDING_GLYPH[item.id], "icon");
  const desc = item.kind === "unit" ? UNITS[item.id].description : BUILDINGS[item.id].description;
  const strength = item.kind === "unit" && UNITS[item.id].strength > 0 ? ` · ${ICON.strength}${UNITS[item.id].strength}` : "";
  return btn(
    "build",
    `${glyph} <span class="build-name">${esc(itemName(item))}</span><span class="build-meta">${cost}${ICON.production}${strength} · ${turnsLabel(turns)}</span>`,
    { cls: `build-item${current ? " current" : ""}`, data: { city: city.id, kind: item.kind, id: item.id }, pressed: current, title: desc },
  );
}

function cityPanel(s: GameState, ui: UiState): string {
  const city = ui.selectedCityId !== null ? getCity(s, ui.selectedCityId) : undefined;
  if (!city || city.owner !== HUMAN_PLAYER) return "";
  const y = cityYields(s, city);
  const growing = city.population < RULES.maxPopulation;
  const foodTurns = turnsToComplete(RULES.foodToGrow - city.food, y.food);
  const current = city.current;
  const prodText = current
    ? `${esc(itemName(current))}: ${city.production}/${itemCost(current)} (${turnsLabel(turnsToComplete(itemCost(current) - city.production, y.production))})`
    : `<span class="warn">Nothing! Pick something below.</span>`;
  const hasLibrary = city.buildings.includes("library");
  const focusButtons = (Object.keys(FOCUS_LABELS) as CityFocus[])
    .map((f) =>
      btn("focus", FOCUS_LABELS[f], {
        data: { city: city.id, focus: f },
        pressed: city.focus === f,
        disabled: f === "science" && !hasLibrary,
        title: f === "science" && !hasLibrary ? "Needs a Library" : f === "science" ? "+50% science in this city" : `Prioritize ${f} tiles`,
      }),
    )
    .join("");
  const items = buildableItems(s, city).map((item) => buildButton(city, item, y.production)).join("");
  const buildings = city.buildings.length
    ? city.buildings.map((b) => `<li title="${esc(BUILDINGS[b].description)}">${sprite(`building:${b}`, BUILDING_GLYPH[b], "icon")} ${esc(BUILDINGS[b].name)}</li>`).join("")
    : "<li class='hint'>None yet</li>";
  return `<section class="panel city-panel" aria-label="City ${esc(city.name)}">
    <div class="panel-head"><h2>${city.isCapital ? "★ " : ""}${esc(city.name)} <small>pop ${city.population}/${RULES.maxPopulation}</small></h2>${btn("close-city", "✕", { cls: "icon-btn", title: "Close city (Esc)" })}</div>
    <p class="yields">${icon("ui:food", ICON.food)} +${y.food} ${icon("ui:production", ICON.production)} +${y.production} ${icon("ui:science", ICON.science)} +${y.science}${y.culture ? ` ${icon("ui:culture", ICON.culture)} +${y.culture}` : ""}</p>
    <p>${icon("ui:food", ICON.food)} Growth: ${growing ? `${city.food}/${RULES.foodToGrow} (${turnsLabel(foodTurns)})` : "max size"}</p>
    ${growing ? bar(city.food, RULES.foodToGrow, "Food toward next population") : ""}
    <p>${icon("ui:production", ICON.production)} ${prodText}</p>
    ${current ? bar(city.production, itemCost(current), "Production progress") : ""}
    <h3>Focus</h3><div class="focus-row" role="group" aria-label="City focus">${focusButtons}</div>
    <h3>Build</h3><div class="build-list">${items}</div>
    <h3>Buildings</h3><ul class="buildings">${buildings}</ul>
  </section>`;
}

function tileInfo(s: GameState, ui: UiState): string {
  const { x, y } = ui.cursor;
  const tile = getTile(s, x, y);
  const explored = getPlayer(s, HUMAN_PLAYER).explored[y * s.width + x];
  if (!tile || !explored) return `<section class="panel tile-info" aria-label="Tile info"><h2>Unexplored</h2></section>`;
  const yields = TERRAIN[tile.terrain].passable ? tileYields(s, x, y) : null;
  const owner = tile.owner !== null ? getPlayer(s, tile.owner) : null;
  const city = cityAt(s, x, y);
  const enemyCity = city && city.owner !== HUMAN_PLAYER ? city : null;
  return `<section class="panel tile-info" aria-label="Tile info">
    <h2>${esc(TERRAIN[tile.terrain].name)}${tile.river ? " + river" : ""}${tile.improvement ? ` + ${esc(IMPROVEMENTS[tile.improvement].name)}` : ""}</h2>
    <p>${yields ? `${icon("ui:food", ICON.food)} ${yields.food} ${icon("ui:production", ICON.production)} ${yields.production}` : "Impassable"}${owner ? ` · ${ownerBadge(owner)} ${esc(owner.name)}` : ""}</p>
    ${enemyCity ? `<p>${esc(enemyCity.name)} · pop ${enemyCity.population}${enemyCity.buildings.includes("walls") ? " · walls" : ""}</p>` : ""}
  </section>`;
}

export function eventList(events: GameEvent[], empty: string): string {
  if (events.length === 0) return `<p class="hint">${esc(empty)}</p>`;
  return `<ul class="events">${events.map((e) => `<li><span class="ev-turn">T${e.turn}</span> ${esc(e.message)}</li>`).join("")}</ul>`;
}

function logPanel(s: GameState, ui: UiState): string {
  const recent = s.events.filter((e) => e.involves.includes(HUMAN_PLAYER)).slice(-8).reverse();
  const lastTurn = ui.lastTurnEvents.length
    ? `<h3>Last turn</h3>${eventList(ui.lastTurnEvents, "")}`
    : "";
  return `<section class="panel log" aria-label="Event log">${lastTurn}<h3>Recent events</h3>${eventList(recent, "Nothing has happened yet.")}</section>`;
}

export function renderSidebar(s: GameState, ui: UiState): string {
  return [warnings(s), attackPanel(s, ui), cityPanel(s, ui), unitPanel(s, ui), tileInfo(s, ui), logPanel(s, ui)].join("");
}

// ---------- modals ----------

function dialog(id: string, title: string, body: string, cls = ""): string {
  return `<div class="backdrop"><div class="dialog ${cls}" role="dialog" aria-modal="true" aria-labelledby="${id}-title"><h2 id="${id}-title">${title}</h2>${body}</div></div>`;
}

function startModal(ui: UiState): string {
  const diff = (["easy", "normal"] as const)
    .map((d) => btn("difficulty", d === "easy" ? "Easy" : "Normal", { data: { difficulty: d }, pressed: ui.difficulty === d, cls: "big" }))
    .join("");
  return dialog(
    "start",
    "Lunchbreak Civ",
    `<p class="tagline">Build a civilization in 30 turns, about 20 minutes. Explore, expand, research, and outscore two rivals.</p>
     <h3>Difficulty</h3><div class="row-buttons" role="group" aria-label="Difficulty">${diff}</div>
     <div class="row-buttons">
       ${btn("new-game", "New Game", { cls: "primary big" })}
       ${ui.hasSave ? btn("continue", "Continue", { cls: "big" }) : ""}
       ${btn("open-help", "How to play", { cls: "big" })}
     </div>`,
    "start",
  );
}

function chooseTechModal(): string {
  const options = STARTING_TECH_CHOICES.map((id) => {
    const t = TECH_BY_ID[id];
    return btn("choose-start-tech", `<strong>${esc(t.name)}</strong><span>${esc(t.description)}</span>`, { data: { tech: id }, cls: "tech-choice big" });
  }).join("");
  return dialog("choose-tech", "Pick a free starting tech", `<p>You start with one tech of your choice.</p><div class="tech-choices">${options}</div>`);
}

function techCard(s: GameState, t: Tech, available: Set<string>, sci: number): string {
  const p = getPlayer(s, HUMAN_PLAYER);
  const done = p.techs.includes(t.id);
  const current = p.researching === t.id;
  const can = available.has(t.id);
  const status = done ? "Researched" : current ? `Researching ${p.science}/${t.cost} · ${turnsLabel(turnsToComplete(t.cost - p.science, sci))}` : can ? `${t.cost} ${ICON.science} · ${turnsLabel(turnsToComplete(t.cost - p.science, sci))}` : `Needs ${t.requires.map((r) => TECH_BY_ID[r].name).join(", ")}`;
  const inner = `<strong>${done ? "✓ " : current ? "▶ " : can ? "" : "🔒 "}${esc(t.name)}</strong><span class="tech-desc">${esc(t.description)}</span><span class="tech-status">${esc(status)}</span>${current ? bar(p.science, t.cost, `${t.name} progress`) : ""}`;
  const cls = `tech-card tier-${t.tier} ${done ? "done" : current ? "current" : can ? "available" : "locked"}`;
  if (can && !current) return btn("research", inner, { data: { tech: t.id }, cls, title: `Research ${t.name}` });
  return `<div class="${cls}" role="group" aria-label="${esc(`${t.name}: ${status}. ${t.description}`)}">${inner}</div>`;
}

function techModal(s: GameState): string {
  const available = new Set<string>(availableTechs(s, HUMAN_PLAYER));
  const sci = playerSciencePerTurn(s, HUMAN_PLAYER);
  const branches: [Tech["branch"], string][] = [["economy", "Economy"], ["military", "Military"], ["science", "Science & Culture"]];
  const cols = branches
    .map(([b, label]) => `<div class="tech-col"><h3>${label}</h3>${TECHS.filter((t) => t.branch === b).sort((a, z) => a.tier - z.tier).map((t) => techCard(s, t, available, sci)).join("")}</div>`)
    .join("");
  const p = getPlayer(s, HUMAN_PLAYER);
  return dialog(
    "tech",
    "Tech Tree",
    `<p>${icon("ui:science", ICON.science)} +${sci} science per turn · ${p.techs.length}/${TECHS.length} researched. Cross-links: Iron Working needs Mining, Civil Service needs Writing, Education needs Engineering.</p>
     <div class="tech-tree">${cols}</div>
     <div class="row-buttons">${btn("close-modal", `Close${kbd("Esc")}`)}</div>`,
    "wide",
  );
}

function helpModal(): string {
  return dialog("help", "How to Play", `<div class="guide">${renderMarkdown(howToPlay.replace(/^# .*\n/, ""))}</div>
    <h3>Keyboard</h3>
    <ul class="keys">
      <li><kbd>Arrows</kbd> move the map cursor · <kbd>Enter</kbd> act on the cursor tile (select / move / attack)</li>
      <li><kbd>Space</kbd> end turn · <kbd>N</kbd> next unit · <kbd>S</kbd> skip unit · <kbd>F</kbd> found city · <kbd>G</kbd>/<kbd>M</kbd> build farm/mine</li>
      <li><kbd>C</kbd> open city at cursor · <kbd>T</kbd> tech tree · <kbd>?</kbd> help · <kbd>Esc</kbd> close / cancel</li>
    </ul>
    <div class="row-buttons">${btn("close-modal", `Close${kbd("Esc")}`, { cls: "primary" })}</div>`, "wide");
}

function awayModal(s: GameState, ui: UiState): string {
  const ago = ui.savedAt ? Math.max(0, Math.round((Date.now() - ui.savedAt) / 60000)) : null;
  const when = ago === null ? "" : ago < 1 ? "You were away less than a minute." : `You were away ${plural(ago, "minute")}.`;
  const score = computeScore(s, HUMAN_PLAYER).total;
  return dialog(
    "away",
    "Welcome back!",
    `<p>${esc(when)} It's turn ${s.turn} of ${s.maxTurns}. You have ${citiesOf(s, HUMAN_PLAYER).length === 1 ? "1 city" : `${citiesOf(s, HUMAN_PLAYER).length} cities`} and ${score} points.</p>
     <h3>What happened last turn</h3>
     ${eventList(ui.awayEvents, "Nothing notable happened.")}
     <div class="row-buttons">${btn("close-modal", "Continue playing", { cls: "primary big" })}</div>`,
  );
}

const VICTORY_TEXT: Record<VictoryType, string> = {
  score: "Score Victory: highest score after turn 30.",
  domination: "Domination Victory: all rival capitals captured.",
  science: "Science Victory: all 12 techs researched.",
  culture: `Culture Victory: ${RULES.cultureVictoryThreshold} culture accumulated.`,
  eliminated: "Your capital was captured.",
};

function endModal(s: GameState): string {
  const won = s.winner === HUMAN_PLAYER;
  const winner = s.winner !== null ? getPlayer(s, s.winner) : null;
  const rows = s.players
    .map((p) => ({ p, sc: computeScore(s, p.id) }))
    .sort((a, b) => b.sc.total - a.sc.total)
    .map(({ p, sc }) => `<tr${p.id === s.winner ? ' class="winner"' : ""}><th scope="row">${ownerBadge(p)} ${esc(p.name)}${p.isHuman ? " (you)" : ""}${p.alive ? "" : " ✝"}</th><td>${sc.cities}</td><td>${sc.population}</td><td>${sc.techs}</td><td>${sc.territory}</td><td>${sc.buildings}</td><td><strong>${sc.total}</strong></td></tr>`)
    .join("");
  return dialog(
    "end",
    won ? "🏆 Victory!" : "Defeat",
    `<p class="tagline">${winner ? `${esc(winner.name)}${winner.isHuman ? " (you)" : ""} wins.` : ""} ${s.victory ? esc(VICTORY_TEXT[s.victory]) : ""}</p>
     <table class="scores"><thead><tr><th scope="col">Player</th><th scope="col">Cities</th><th scope="col">Pop</th><th scope="col">Techs</th><th scope="col">Land</th><th scope="col">Buildings</th><th scope="col">Total</th></tr></thead><tbody>${rows}</tbody></table>
     <div class="row-buttons">${btn("play-again", "Play again", { cls: "primary big" })}</div>`,
  );
}

export function renderModal(s: GameState | null, ui: UiState): string {
  switch (ui.modal) {
    case "start":
      return startModal(ui);
    case "help":
      return helpModal();
    case "chooseTech":
      return chooseTechModal();
    case "tech":
      return s ? techModal(s) : "";
    case "away":
      return s ? awayModal(s, ui) : "";
    case "end":
      return s ? endModal(s) : "";
    default:
      return "";
  }
}
