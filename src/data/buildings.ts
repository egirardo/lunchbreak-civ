import type { TechId } from "./techs";

export type BuildingId = "granary" | "workshop" | "walls" | "library" | "temple" | "university";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  cost: number;
  requiresTech: TechId;
  food: number;
  production: number;
  science: number;
  culture: number;
  scorePerTurn: number;
  defenseMultiplier: number;
  description: string;
}

const base = { food: 0, production: 0, science: 0, culture: 0, scorePerTurn: 0, defenseMultiplier: 1 };

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  granary: { ...base, id: "granary", name: "Granary", cost: 20, requiresTech: "agriculture", food: 1, description: "+1 food per turn." },
  workshop: { ...base, id: "workshop", name: "Workshop", cost: 25, requiresTech: "engineering", production: 2, description: "+2 production per turn." },
  walls: { ...base, id: "walls", name: "Walls", cost: 20, requiresTech: "bronzeWorking", defenseMultiplier: 1.5, description: "+50% city defense." },
  library: { ...base, id: "library", name: "Library", cost: 25, requiresTech: "writing", science: 1, description: "+1 science per turn (+2 with Mathematics)." },
  temple: { ...base, id: "temple", name: "Temple", cost: 40, requiresTech: "philosophy", culture: 2, scorePerTurn: 2, description: "+2 culture and +2 score per turn." },
  university: { ...base, id: "university", name: "University", cost: 40, requiresTech: "education", science: 3, scorePerTurn: 3, description: "+3 science and +3 score per turn." },
};
