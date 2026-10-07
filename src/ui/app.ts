import { endTurn } from "../core/game";
import { tileIndex, type Point } from "../core/grid";
import {
  attackTargets,
  cityAt,
  getPlayer,
  getUnit,
  nextUnitNeedingOrders,
  reachableTiles,
  unitAt,
  visibleTiles,
} from "../core/queries";
import {
  attack,
  buildImprovement,
  chooseStartingTech,
  foundCity,
  moveUnit,
  newGame,
  setFocus,
  setProduction,
  setResearch,
  skipUnit,
} from "../core/rules";
import { HUMAN_PLAYER, RuleError, type BuildItem, type CityFocus, type Difficulty, type GameEvent, type GameState, type Unit } from "../core/state";
import type { BuildingId } from "../data/buildings";
import type { ImprovementId } from "../data/improvements";
import type { TechId } from "../data/techs";
import type { UnitTypeId } from "../data/units";
import { clearSave, loadGame, saveGame } from "../storage/save";
import { isMusicEnabled, isMuted, playSfx, setMusicEnabled, setMuted, startMusic, stopMusic, unlockAudio, type SfxName } from "./audio";
import { minutesLabel } from "./format";
import { renderMap, tileId, type MapContext } from "./mapView";
import { renderModal, renderSidebar, renderTopbar } from "./panels";
import { initialUiState, type Modal, type UiState } from "./uiState";

const TARGET_SECONDS_PER_TURN = 40;
const STACKED_MODALS: Modal[] = ["help", "tech"];

function eventKey(e: GameEvent): string {
  return `${e.turn}|${e.kind}|${e.message}`;
}

function samePoint(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export class App {
  private state: GameState | null = null;
  private ui: UiState;
  private turnStartedAt = Date.now();
  private turnDurations: number[] = [];
  private audioUnlocked = false;
  private lastModal: Modal = null;
  private lastCursor: Point | null = null;

  private readonly layout: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly map: HTMLElement;
  private readonly sidebar: HTMLElement;
  private readonly modal: HTMLElement;
  private readonly live: HTMLElement;

  constructor(root: HTMLElement) {
    this.ui = initialUiState(loadGame() !== null);
    root.innerHTML = `
      <div class="layout" id="layout">
        <header class="topbar" id="topbar"></header>
        <main class="main">
          <div class="map-wrap"><div class="map" id="map" role="grid" tabindex="0" aria-label="Map. Use arrow keys to move the cursor and Enter to act."></div></div>
          <aside class="sidebar" id="sidebar" aria-label="Details"></aside>
        </main>
      </div>
      <div id="modal"></div>
      <div id="live" class="sr-only" aria-live="polite" aria-atomic="true"></div>`;
    const get = (id: string): HTMLElement => {
      const el = root.querySelector<HTMLElement>(`#${id}`);
      if (!el) throw new Error(`Missing #${id}`);
      return el;
    };
    this.layout = get("layout");
    this.topbar = get("topbar");
    this.map = get("map");
    this.sidebar = get("sidebar");
    this.modal = get("modal");
    this.live = get("live");

    root.addEventListener("click", (e) => this.onClick(e));
    document.addEventListener("keydown", (e) => this.onKey(e));
    const unlock = (): void => {
      if (this.audioUnlocked) return;
      this.audioUnlocked = true;
      unlockAudio();
    };
    document.addEventListener("pointerdown", unlock, { capture: true });
    document.addEventListener("keydown", unlock, { capture: true });
    window.setInterval(() => {
      if (this.state && this.ui.modal === null) this.renderTopbarOnly();
    }, 10_000);

    this.render();
  }

  // ---------- derived ----------

  private selectedUnit(): Unit | null {
    if (!this.state || this.ui.selectedUnitId === null) return null;
    const u = getUnit(this.state, this.ui.selectedUnitId);
    return u && u.owner === HUMAN_PLAYER ? u : null;
  }

  private timeLeft(): string {
    if (!this.state) return "";
    // Seed with the target as if it were a few prior turns, so one quick turn doesn't skew the estimate.
    const priorTurns = 3;
    const measured = this.turnDurations.reduce((a, b) => a + b, 0);
    const avg = (measured + TARGET_SECONDS_PER_TURN * priorTurns) / (this.turnDurations.length + priorTurns);
    const elapsed = (Date.now() - this.turnStartedAt) / 1000;
    const turnsLeft = this.state.maxTurns - this.state.turn + 1;
    const seconds = Math.max(0, avg * turnsLeft - Math.min(elapsed, avg));
    return `${seconds < 60 ? "" : "~"}${minutesLabel(seconds)} left`;
  }

  private mapContext(s: GameState): MapContext {
    const sel = this.selectedUnit();
    const reach = new Map<number, number>();
    const targets = new Set<number>();
    if (sel && s.phase === "playing") {
      for (const r of reachableTiles(s, sel)) reach.set(tileIndex(s, r.x, r.y), r.cost);
      for (const t of attackTargets(s, sel)) targets.add(tileIndex(s, t.x, t.y));
    }
    return {
      s,
      ui: this.ui,
      visible: visibleTiles(s, HUMAN_PLAYER),
      explored: getPlayer(s, HUMAN_PLAYER).explored,
      reach,
      targets,
      selectedUnitId: sel?.id ?? null,
    };
  }

  // ---------- rendering ----------

  private render(): void {
    const active = document.activeElement as HTMLElement | null;
    const focusKey = active?.dataset.focusKey;
    const mapFocused = active === this.map;
    const s = this.state;

    if (s) {
      this.topbar.innerHTML = renderTopbar(s, this.timeLeft());
      this.map.innerHTML = renderMap(this.mapContext(s));
      this.map.setAttribute("aria-activedescendant", tileId(this.ui.cursor.x, this.ui.cursor.y));
      this.sidebar.innerHTML = renderSidebar(s, this.ui);
    } else {
      this.topbar.innerHTML = "";
      this.map.innerHTML = "";
      this.sidebar.innerHTML = "";
    }
    this.modal.innerHTML = renderModal(s, this.ui);
    this.layout.inert = this.ui.modal !== null;

    if (this.ui.modal !== this.lastModal && this.ui.modal !== null) {
      this.modal.querySelector<HTMLElement>(".dialog button:not([disabled])")?.focus();
    } else if (this.ui.modal === null && this.lastModal !== null) {
      this.map.focus();
    } else if (mapFocused) {
      this.map.focus();
    } else if (focusKey) {
      const el = document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`);
      if (el && !(el as HTMLButtonElement).disabled) el.focus();
      else if (this.ui.modal === null) this.map.focus();
    }
    this.lastModal = this.ui.modal;

    if (s && (!this.lastCursor || !samePoint(this.lastCursor, this.ui.cursor))) {
      document.getElementById(tileId(this.ui.cursor.x, this.ui.cursor.y))?.scrollIntoView({ block: "nearest", inline: "nearest" });
      this.lastCursor = { ...this.ui.cursor };
    }
  }

  private renderTopbarOnly(): void {
    if (!this.state) return;
    const focusKey = (document.activeElement as HTMLElement | null)?.dataset.focusKey;
    this.topbar.innerHTML = renderTopbar(this.state, this.timeLeft());
    if (focusKey) document.querySelector<HTMLElement>(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
  }

  private announce(text: string): void {
    this.live.textContent = "";
    window.setTimeout(() => {
      this.live.textContent = text;
    }, 50);
  }

  private sfx(name: SfxName): void {
    playSfx(name);
  }

  // ---------- state changes ----------

  /** Applies a core action; rule violations become a status message instead of a crash. */
  private tryAction(fn: (s: GameState) => GameState): boolean {
    if (!this.state) return false;
    try {
      this.commit(fn(this.state));
      return true;
    } catch (e) {
      if (e instanceof RuleError) {
        this.ui.status = e.message;
        this.announce(e.message);
        this.sfx("error");
        this.render();
        return false;
      }
      throw e;
    }
  }

  private commit(next: GameState): void {
    this.state = next;
    try {
      if (next.phase === "ended") clearSave();
      else saveGame(next);
    } catch {
      // Storage can be unavailable (private mode, quota); the game still works without saving.
    }
    this.ui.hasSave = next.phase !== "ended";
  }

  private beginPlayerTurn(): void {
    this.turnStartedAt = Date.now();
    this.ui.pendingAttack = null;
    this.selectNext();
  }

  private selectNext(afterId?: number): void {
    const s = this.state;
    if (!s) return;
    const u = nextUnitNeedingOrders(s, HUMAN_PLAYER, afterId);
    this.ui.pendingAttack = null;
    if (u) {
      this.ui.selectedUnitId = u.id;
      this.ui.cursor = { x: u.x, y: u.y };
      this.ui.status = "";
    } else {
      this.ui.selectedUnitId = null;
      this.ui.status = "All units have orders. Press Space to end the turn.";
    }
  }

  private afterUnitAction(unitId: number): void {
    const s = this.state;
    if (!s) return;
    const u = getUnit(s, unitId);
    if (!u || u.movesLeft <= 0 || u.skipped || u.task) this.selectNext(unitId);
    else this.ui.cursor = { x: u.x, y: u.y };
  }

  private checkGameOver(): boolean {
    const s = this.state;
    if (!s || s.phase !== "ended") return false;
    this.ui.modal = "end";
    this.ui.selectedUnitId = null;
    this.ui.selectedCityId = null;
    const won = s.winner === HUMAN_PLAYER;
    this.sfx(won ? "victory" : "defeat");
    stopMusic();
    this.announce(won ? "Victory! You win." : "Defeat. The game is over.");
    return true;
  }

  // ---------- actions ----------

  private startNewGame(): void {
    const seed = Math.floor(Math.random() * 2 ** 31);
    this.state = newGame({ seed, difficulty: this.ui.difficulty });
    this.turnDurations = [];
    this.ui.modal = "chooseTech";
    this.ui.lastTurnEvents = [];
    this.ui.selectedCityId = null;
    const settler = this.state.units.find((u) => u.owner === HUMAN_PLAYER && u.type === "settler");
    if (settler) this.ui.cursor = { x: settler.x, y: settler.y };
    if (isMusicEnabled()) startMusic();
  }

  private continueGame(): void {
    const data = loadGame();
    if (!data) {
      this.ui.hasSave = false;
      return;
    }
    this.state = data.state;
    this.ui.savedAt = data.savedAt;
    this.turnDurations = [];
    const s = data.state;
    this.ui.awayEvents = s.events.filter((e) => e.turn >= s.turn - 1 && e.involves.includes(HUMAN_PLAYER));
    this.ui.lastTurnEvents = [];
    if (s.phase === "chooseTech") this.ui.modal = "chooseTech";
    else if (s.phase === "ended") this.ui.modal = "end";
    else {
      this.ui.modal = "away";
      this.beginPlayerTurn();
    }
    if (isMusicEnabled() && s.phase !== "ended") startMusic();
  }

  private chooseStartTech(tech: TechId): void {
    if (this.tryAction((s) => chooseStartingTech(s, tech))) {
      this.ui.modal = null;
      this.sfx("tech");
      this.beginPlayerTurn();
      this.announce("Game started. Move your Settler and found your capital with F.");
    }
    this.render();
  }

  private activateTile(p: Point): void {
    const s = this.state;
    if (!s || s.phase !== "playing") return;
    this.ui.cursor = p;
    const pa = this.ui.pendingAttack;
    if (pa && samePoint(pa.target, p)) {
      this.confirmAttack();
      return;
    }
    this.ui.pendingAttack = null;
    const sel = this.selectedUnit();
    if (sel) {
      if (attackTargets(s, sel).some((t) => samePoint(t, p))) {
        this.ui.pendingAttack = { unitId: sel.id, target: p };
        this.sfx("select");
        this.announce("Attack preview shown. Press Enter again to attack, Escape to cancel.");
        this.render();
        return;
      }
      if (reachableTiles(s, sel).some((r) => samePoint(r, p))) {
        if (this.tryAction((st) => moveUnit(st, sel.id, p))) {
          this.sfx("move");
          this.afterUnitAction(sel.id);
        }
        this.render();
        return;
      }
    }
    const unit = unitAt(s, p.x, p.y);
    const city = cityAt(s, p.x, p.y);
    if (unit && unit.owner === HUMAN_PLAYER && unit.id !== sel?.id) {
      this.ui.selectedUnitId = unit.id;
      this.ui.status = "";
      this.sfx("select");
    } else if (city && city.owner === HUMAN_PLAYER) {
      this.ui.selectedCityId = city.id;
      this.sfx("select");
    }
    this.render();
  }

  private confirmAttack(): void {
    const s = this.state;
    const pa = this.ui.pendingAttack;
    if (!s || !pa) return;
    this.ui.pendingAttack = null;
    try {
      const result = attack(s, pa.unitId, pa.target);
      this.commit(result.state);
      const last = result.state.events[result.state.events.length - 1];
      this.sfx(result.attackerWon ? "attackWin" : "attackLose");
      this.announce(last?.message ?? (result.attackerWon ? "Victory!" : "Defeat."));
      this.ui.status = last?.message ?? "";
      if (!this.checkGameOver()) this.afterUnitAction(pa.unitId);
    } catch (e) {
      if (!(e instanceof RuleError)) throw e;
      this.ui.status = e.message;
      this.sfx("error");
    }
    this.render();
  }

  private foundCityAction(): void {
    const u = this.selectedUnit();
    if (!u || u.type !== "settler") return;
    if (this.tryAction((s) => foundCity(s, u.id))) {
      const s = this.state;
      const city = s?.cities.find((c) => c.x === u.x && c.y === u.y);
      if (city) {
        this.ui.selectedCityId = city.id;
        this.announce(`Founded ${city.name}. Choose what it should build.`);
      }
      this.sfx("cityFounded");
      this.selectNext(u.id);
    }
    this.render();
  }

  private improveAction(improvement: ImprovementId): void {
    const u = this.selectedUnit();
    if (!u || u.type !== "worker") return;
    if (this.tryAction((s) => buildImprovement(s, u.id, improvement))) {
      this.sfx("built");
      this.selectNext(u.id);
    }
    this.render();
  }

  private skipAction(): void {
    const u = this.selectedUnit();
    if (!u) return;
    if (this.tryAction((s) => skipUnit(s, u.id))) this.selectNext(u.id);
    this.render();
  }

  private endTurnAction(): void {
    const s = this.state;
    if (!s || s.phase !== "playing" || this.ui.modal !== null) return;
    const lastBefore = s.events[s.events.length - 1];
    const before = s.turn;
    const next = endTurn(s);
    this.turnDurations.push((Date.now() - this.turnStartedAt) / 1000);
    let start = 0;
    if (lastBefore) {
      const key = eventKey(lastBefore);
      for (let i = next.events.length - 1; i >= 0; i--) {
        const e = next.events[i];
        if (e && eventKey(e) === key) {
          start = i + 1;
          break;
        }
      }
    }
    const fresh = next.events.slice(start).filter((e) => e.involves.includes(HUMAN_PLAYER));
    this.ui.lastTurnEvents = fresh;
    this.commit(next);
    this.sfx("endTurn");
    if (fresh.some((e) => e.kind === "techResearched" && e.involves[0] === HUMAN_PLAYER)) this.sfx("tech");
    else if (fresh.some((e) => e.kind === "built" && e.involves[0] === HUMAN_PLAYER)) this.sfx("built");
    if (this.checkGameOver()) {
      this.render();
      return;
    }
    this.beginPlayerTurn();
    const summary = fresh.length ? fresh.map((e) => e.message).join(" ") : "Nothing notable happened.";
    this.announce(`Turn ${next.turn} of ${next.maxTurns} (ended turn ${before}). ${summary}`);
    this.render();
  }

  private openCity(cityId: number | null): void {
    const s = this.state;
    if (!s) return;
    if (cityId === null) {
      const c = cityAt(s, this.ui.cursor.x, this.ui.cursor.y);
      const u = this.selectedUnit();
      const fromUnit = u ? cityAt(s, u.x, u.y) : undefined;
      const target = c?.owner === HUMAN_PLAYER ? c : fromUnit?.owner === HUMAN_PLAYER ? fromUnit : undefined;
      if (!target) return;
      cityId = target.id;
    }
    this.ui.selectedCityId = cityId;
    const city = s.cities.find((c) => c.id === cityId);
    if (city) this.ui.cursor = { x: city.x, y: city.y };
    this.render();
    this.sidebar.querySelector<HTMLElement>(".city-panel button")?.focus();
  }

  private openModal(m: Modal): void {
    if (STACKED_MODALS.includes(m) && this.ui.modal !== m) this.ui.returnModal = this.ui.modal;
    this.ui.modal = m;
    this.render();
  }

  private closeModal(): void {
    const m = this.ui.modal;
    if (m === "start" || m === "chooseTech" || m === "end") return;
    this.ui.modal = STACKED_MODALS.includes(m) ? this.ui.returnModal : null;
    this.ui.returnModal = null;
    this.render();
  }

  // ---------- input ----------

  private onClick(e: MouseEvent): void {
    const target = e.target as HTMLElement;
    const button = target.closest<HTMLElement>("[data-action]");
    if (button) {
      this.handleAction(button.dataset.action ?? "", button.dataset);
      return;
    }
    const tile = target.closest<HTMLElement>(".tile");
    if (tile && this.ui.modal === null) {
      this.map.focus();
      this.activateTile({ x: Number(tile.dataset.x), y: Number(tile.dataset.y) });
    }
  }

  private handleAction(action: string, data: DOMStringMap): void {
    const s = this.state;
    switch (action) {
      case "difficulty":
        this.ui.difficulty = (data.difficulty as Difficulty) ?? "normal";
        break;
      case "new-game":
        this.startNewGame();
        break;
      case "continue":
        this.continueGame();
        break;
      case "choose-start-tech":
        this.chooseStartTech(data.tech as TechId);
        return;
      case "open-help":
        this.openModal("help");
        return;
      case "open-tech":
        if (s) this.openModal("tech");
        return;
      case "close-modal":
        this.closeModal();
        return;
      case "research":
        if (this.tryAction((st) => setResearch(st, HUMAN_PLAYER, data.tech as TechId))) {
          this.sfx("select");
          this.announce(`Researching ${data.tech ?? ""}.`);
          this.closeModal();
        }
        return;
      case "end-turn":
        this.endTurnAction();
        return;
      case "found-city":
        this.foundCityAction();
        return;
      case "improve":
        this.improveAction(data.improvement as ImprovementId);
        return;
      case "skip":
        this.skipAction();
        return;
      case "next-unit":
        this.selectNext(this.ui.selectedUnitId ?? undefined);
        break;
      case "confirm-attack":
        this.confirmAttack();
        return;
      case "cancel-attack":
        this.ui.pendingAttack = null;
        break;
      case "open-city":
        this.openCity(data.city !== undefined ? Number(data.city) : null);
        return;
      case "close-city":
        this.ui.selectedCityId = null;
        break;
      case "build": {
        const item: BuildItem = data.kind === "unit" ? { kind: "unit", id: data.id as UnitTypeId } : { kind: "building", id: data.id as BuildingId };
        if (this.tryAction((st) => setProduction(st, Number(data.city), item))) this.sfx("select");
        break;
      }
      case "focus":
        if (this.tryAction((st) => setFocus(st, Number(data.city), data.focus as CityFocus))) this.sfx("select");
        break;
      case "toggle-sound":
        setMuted(!isMuted());
        break;
      case "toggle-music":
        setMusicEnabled(!isMusicEnabled());
        if (isMusicEnabled()) startMusic();
        else stopMusic();
        break;
      case "play-again":
        this.state = null;
        this.ui = initialUiState(false);
        clearSave();
        break;
      default:
        return;
    }
    this.render();
  }

  private moveCursor(dx: number, dy: number): void {
    const s = this.state;
    if (!s) return;
    this.ui.cursor = {
      x: Math.min(s.width - 1, Math.max(0, this.ui.cursor.x + dx)),
      y: Math.min(s.height - 1, Math.max(0, this.ui.cursor.y + dy)),
    };
    this.map.focus();
    this.render();
  }

  private onKey(e: KeyboardEvent): void {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (target.matches("input, select, textarea")) return;
    const onButton = target.tagName === "BUTTON";
    const modal = this.ui.modal;

    if (e.key === "Escape") {
      e.preventDefault();
      if (modal) this.closeModal();
      else if (this.ui.pendingAttack) {
        this.ui.pendingAttack = null;
        this.render();
      } else if (this.ui.selectedCityId !== null) {
        this.ui.selectedCityId = null;
        this.render();
      }
      return;
    }
    if (e.key === "?") {
      e.preventDefault();
      this.openModal("help");
      return;
    }
    if (modal) {
      if ((e.key === "t" || e.key === "T") && modal === "tech") this.closeModal();
      return;
    }
    if (!this.state || this.state.phase !== "playing") return;

    const arrows: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
    const dir = arrows[e.key];
    if (dir && !onButton) {
      e.preventDefault();
      this.moveCursor(dir[0], dir[1]);
      return;
    }
    if (dir && onButton && target.closest(".map-wrap")) return;

    switch (e.key) {
      case "Enter":
        if (onButton) return;
        e.preventDefault();
        if (this.ui.pendingAttack) this.confirmAttack();
        else if (target === this.map) this.activateTile({ ...this.ui.cursor });
        else this.endTurnAction();
        return;
      case " ":
        if (onButton) return;
        e.preventDefault();
        this.endTurnAction();
        return;
      case "f":
      case "F":
        this.foundCityAction();
        return;
      case "g":
      case "G":
        this.improveAction("farm");
        return;
      case "m":
      case "M":
        this.improveAction("mine");
        return;
      case "s":
      case "S":
        this.skipAction();
        return;
      case "n":
      case "N":
        this.selectNext(this.ui.selectedUnitId ?? undefined);
        this.render();
        return;
      case "c":
      case "C":
        this.openCity(null);
        return;
      case "t":
      case "T":
        this.openModal("tech");
        return;
      default:
    }
  }
}
