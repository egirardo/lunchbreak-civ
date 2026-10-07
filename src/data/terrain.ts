export type TerrainId = "grassland" | "forest" | "hills" | "water" | "mountains";

export interface Yields {
  food: number;
  production: number;
  science: number;
}

export interface TerrainDef {
  id: TerrainId;
  name: string;
  yields: Yields;
  passable: boolean;
}

export const TERRAIN: Record<TerrainId, TerrainDef> = {
  grassland: { id: "grassland", name: "Grassland", yields: { food: 1, production: 0, science: 0 }, passable: true },
  forest: { id: "forest", name: "Forest", yields: { food: 1, production: 1, science: 0 }, passable: true },
  hills: { id: "hills", name: "Hills", yields: { food: 0, production: 2, science: 0 }, passable: true },
  water: { id: "water", name: "Water", yields: { food: 0, production: 0, science: 0 }, passable: false },
  mountains: { id: "mountains", name: "Mountains", yields: { food: 0, production: 0, science: 0 }, passable: false },
};
