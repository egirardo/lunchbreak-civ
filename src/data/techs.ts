import type { BuildingId } from "./buildings";
import type { ImprovementId } from "./improvements";
import type { UnitTypeId } from "./units";

export type TechId =
  | "agriculture"
  | "mining"
  | "engineering"
  | "civilService"
  | "bronzeWorking"
  | "archery"
  | "horsebackRiding"
  | "ironWorking"
  | "writing"
  | "mathematics"
  | "philosophy"
  | "education";

export type TechEffect = "cityLimit+1" | "libraryScience+1" | "upgradeWarriors";

export interface Tech {
  id: TechId;
  name: string;
  branch: "economy" | "military" | "science";
  tier: 1 | 2 | 3 | 4;
  cost: number;
  requires: TechId[];
  unlocks: {
    units?: UnitTypeId[];
    buildings?: BuildingId[];
    improvements?: ImprovementId[];
    effects?: TechEffect[];
  };
  description: string;
}

export const TECHS: Tech[] = [
  {
    id: "agriculture", name: "Agriculture", branch: "economy", tier: 1, cost: 10, requires: [],
    unlocks: { improvements: ["farm"], buildings: ["granary"] },
    description: "Workers can build Farms (+1 food). Cities can build Granaries.",
  },
  {
    id: "mining", name: "Mining", branch: "economy", tier: 2, cost: 20, requires: ["agriculture"],
    unlocks: { improvements: ["mine"] },
    description: "Workers can build Mines (+1 production).",
  },
  {
    id: "engineering", name: "Engineering", branch: "economy", tier: 3, cost: 30, requires: ["mining"],
    unlocks: { buildings: ["workshop"] },
    description: "Cities can build Workshops (+2 production).",
  },
  {
    id: "civilService", name: "Civil Service", branch: "economy", tier: 4, cost: 40, requires: ["engineering", "writing"],
    unlocks: { effects: ["cityLimit+1"] },
    description: "You may have 5 cities instead of 4.",
  },
  {
    id: "bronzeWorking", name: "Bronze Working", branch: "military", tier: 1, cost: 10, requires: [],
    unlocks: { buildings: ["walls"] },
    description: "Cities can build Walls (+50% city defense).",
  },
  {
    id: "archery", name: "Archery", branch: "military", tier: 2, cost: 20, requires: ["bronzeWorking"],
    unlocks: { units: ["archer"] },
    description: "Train Archers: ranged attack from 2 tiles away.",
  },
  {
    id: "horsebackRiding", name: "Horseback Riding", branch: "military", tier: 3, cost: 30, requires: ["archery"],
    unlocks: { units: ["horseman"] },
    description: "Train Horsemen: strength 8, moves 4.",
  },
  {
    id: "ironWorking", name: "Iron Working", branch: "military", tier: 4, cost: 40, requires: ["horsebackRiding", "mining"],
    unlocks: { units: ["swordsman"], effects: ["upgradeWarriors"] },
    description: "Warriors upgrade to Swordsmen (strength 12).",
  },
  {
    id: "writing", name: "Writing", branch: "science", tier: 1, cost: 10, requires: [],
    unlocks: { buildings: ["library"] },
    description: "Cities can build Libraries (+1 science).",
  },
  {
    id: "mathematics", name: "Mathematics", branch: "science", tier: 2, cost: 20, requires: ["writing"],
    unlocks: { effects: ["libraryScience+1"] },
    description: "Libraries give +1 extra science.",
  },
  {
    id: "philosophy", name: "Philosophy", branch: "science", tier: 3, cost: 30, requires: ["mathematics"],
    unlocks: { buildings: ["temple"] },
    description: "Cities can build Temples (+2 culture, +2 score per turn).",
  },
  {
    id: "education", name: "Education", branch: "science", tier: 4, cost: 40, requires: ["philosophy", "engineering"],
    unlocks: { buildings: ["university"] },
    description: "Cities can build Universities (+3 science, +3 score per turn).",
  },
];

export const TECH_BY_ID: Record<TechId, Tech> = Object.fromEntries(TECHS.map((t) => [t.id, t])) as Record<TechId, Tech>;

export const STARTING_TECH_CHOICES: TechId[] = TECHS.filter((t) => t.tier === 1).map((t) => t.id);
