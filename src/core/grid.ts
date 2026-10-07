export interface Point {
  x: number;
  y: number;
}

export interface GridSize {
  width: number;
  height: number;
}

export function tileIndex(size: GridSize, x: number, y: number): number {
  return y * size.width + x;
}

export function inBounds(size: GridSize, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < size.width && y < size.height;
}

/** Square grid with diagonals, so distance is Chebyshev. */
export function distance(a: Point, b: Point): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function neighbors(size: GridSize, x: number, y: number): Point[] {
  return pointsInRadius(size, x, y, 1).filter((p) => p.x !== x || p.y !== y);
}

export function pointsInRadius(size: GridSize, x: number, y: number, radius: number): Point[] {
  const out: Point[] = [];
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = x + dx;
      const ny = y + dy;
      if (inBounds(size, nx, ny)) out.push({ x: nx, y: ny });
    }
  }
  return out;
}
