import { TERRAIN, type TerrainId } from "../data/terrain";
import { distance, inBounds, neighbors, tileIndex, type GridSize, type Point } from "./grid";
import { Rng } from "./rng";
import type { Tile } from "./state";

export interface GeneratedMap {
  tiles: Tile[];
  starts: Point[];
}

const MAX_ATTEMPTS = 50;

export function generateMap(rng: Rng, size: GridSize, playerCount: number): GeneratedMap {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const tiles = generateTerrain(rng, size);
    const starts = pickStarts(rng, size, tiles, playerCount);
    if (starts) return { tiles, starts };
  }
  throw new Error("Could not generate a playable map");
}

function generateTerrain(rng: Rng, size: GridSize): Tile[] {
  // Smoothed value noise gives clumped terrain instead of salt-and-pepper.
  const raw = Array.from({ length: size.width * size.height }, () => rng.next());
  const height = smooth(size, smooth(size, raw));
  const moisture = smooth(size, Array.from({ length: size.width * size.height }, () => rng.next()));

  const sorted = [...height].sort((a, b) => a - b);
  const waterLevel = sorted[Math.floor(sorted.length * 0.14)] ?? 0;
  const mountainLevel = sorted[Math.floor(sorted.length * 0.93)] ?? 1;
  const hillLevel = sorted[Math.floor(sorted.length * 0.8)] ?? 1;

  const tiles: Tile[] = height.map((h, i) => {
    let terrain: TerrainId;
    if (h <= waterLevel) terrain = "water";
    else if (h >= mountainLevel) terrain = "mountains";
    else if (h >= hillLevel) terrain = "hills";
    else terrain = (moisture[i] ?? 0) > 0.52 ? "forest" : "grassland";
    return { terrain, river: false, improvement: null, owner: null, cityId: null };
  });

  addRivers(rng, size, tiles, height);
  return tiles;
}

function smooth(size: GridSize, values: number[]): number[] {
  return values.map((_, i) => {
    const x = i % size.width;
    const y = Math.floor(i / size.width);
    const around = neighbors(size, x, y).map((p) => values[tileIndex(size, p.x, p.y)] ?? 0);
    const total = around.reduce((a, b) => a + b, values[i] ?? 0);
    return total / (around.length + 1);
  });
}

/** Rivers flow downhill from high ground, marking passable tiles as river tiles. */
function addRivers(rng: Rng, size: GridSize, tiles: Tile[], height: number[]): void {
  const riverCount = 2 + rng.int(2);
  const candidates = tiles
    .map((t, i) => ({ t, i }))
    .filter(({ t }) => t.terrain === "hills" || t.terrain === "forest")
    .map(({ i }) => i);
  rng.shuffle(candidates);

  for (let r = 0; r < riverCount && r < candidates.length; r++) {
    let current = candidates[r] as number;
    for (let step = 0; step < 10; step++) {
      const tile = tiles[current];
      if (!tile || !TERRAIN[tile.terrain].passable) break;
      tile.river = true;
      const x = current % size.width;
      const y = Math.floor(current / size.width);
      const options = neighbors(size, x, y)
        .filter((p) => p.x === x || p.y === y)
        .map((p) => tileIndex(size, p.x, p.y))
        .filter((i) => !tiles[i]?.river);
      if (options.length === 0) break;
      options.sort((a, b) => (height[a] ?? 0) - (height[b] ?? 0));
      current = options[0] as number;
    }
  }
}

function isGoodStart(size: GridSize, tiles: Tile[], p: Point): boolean {
  const tile = tiles[tileIndex(size, p.x, p.y)];
  if (!tile || !TERRAIN[tile.terrain].passable) return false;
  const passableAround = neighbors(size, p.x, p.y).filter((n) => {
    const t = tiles[tileIndex(size, n.x, n.y)];
    return t !== undefined && TERRAIN[t.terrain].passable;
  });
  return passableAround.length >= 5;
}

function pickStarts(rng: Rng, size: GridSize, tiles: Tile[], count: number): Point[] | null {
  const candidates: Point[] = [];
  for (let y = 1; y < size.height - 1; y++) {
    for (let x = 1; x < size.width - 1; x++) {
      if (isGoodStart(size, tiles, { x, y })) candidates.push({ x, y });
    }
  }
  if (candidates.length < count) return null;

  // Try several random sets and keep the one with the largest minimum spacing.
  let best: Point[] | null = null;
  let bestSpacing = -1;
  for (let attempt = 0; attempt < 200; attempt++) {
    const set: Point[] = [];
    for (let i = 0; i < count; i++) set.push(rng.pick(candidates));
    let spacing = Infinity;
    for (let i = 0; i < set.length; i++) {
      for (let j = i + 1; j < set.length; j++) {
        spacing = Math.min(spacing, distance(set[i] as Point, set[j] as Point));
      }
    }
    if (spacing > bestSpacing) {
      bestSpacing = spacing;
      best = set;
    }
  }
  if (!best || bestSpacing < 6) return null;
  if (!allConnected(size, tiles, best)) return null;
  return best;
}

function allConnected(size: GridSize, tiles: Tile[], points: Point[]): boolean {
  const first = points[0];
  if (!first) return true;
  const seen = new Set<number>([tileIndex(size, first.x, first.y)]);
  const queue: Point[] = [first];
  while (queue.length > 0) {
    const p = queue.shift() as Point;
    for (const n of neighbors(size, p.x, p.y)) {
      const i = tileIndex(size, n.x, n.y);
      const t = tiles[i];
      if (seen.has(i) || !t || !TERRAIN[t.terrain].passable) continue;
      seen.add(i);
      queue.push(n);
    }
  }
  return points.every((p) => inBounds(size, p.x, p.y) && seen.has(tileIndex(size, p.x, p.y)));
}
