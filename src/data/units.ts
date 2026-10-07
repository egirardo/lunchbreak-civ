import type { TechId } from "./techs";

export type UnitTypeId = "settler" | "warrior" | "archer" | "horseman" | "worker" | "swordsman";

export type AttackKind = "none" | "melee" | "ranged";

export interface UnitDef {
  id: UnitTypeId;
  name: string;
  strength: number;
  moves: number;
  cost: number;
  attack: AttackKind;
  range: number;
  requiresTech: TechId | null;
  obsoletedBy: TechId | null;
  canBeAttacked: boolean;
  description: string;
}

export const UNITS: Record<UnitTypeId, UnitDef> = {
  settler: {
    id: "settler", name: "Settler", strength: 0, moves: 2, cost: 20, attack: "none", range: 0,
    requiresTech: null, obsoletedBy: null, canBeAttacked: true,
    description: "Founds a new city. Consumed when used.",
  },
  warrior: {
    id: "warrior", name: "Warrior", strength: 5, moves: 2, cost: 20, attack: "melee", range: 1,
    requiresTech: null, obsoletedBy: "ironWorking", canBeAttacked: true,
    description: "Basic melee unit.",
  },
  archer: {
    id: "archer", name: "Archer", strength: 7, moves: 2, cost: 20, attack: "ranged", range: 2,
    requiresTech: "archery", obsoletedBy: null, canBeAttacked: true,
    description: "Attacks from up to 2 tiles away. Survives a failed ranged attack.",
  },
  horseman: {
    id: "horseman", name: "Horseman", strength: 8, moves: 4, cost: 25, attack: "melee", range: 1,
    requiresTech: "horsebackRiding", obsoletedBy: null, canBeAttacked: true,
    description: "Fast melee unit.",
  },
  worker: {
    id: "worker", name: "Worker", strength: 0, moves: 2, cost: 15, attack: "none", range: 0,
    requiresTech: null, obsoletedBy: null, canBeAttacked: false,
    description: "Builds Farms and Mines. Cannot be attacked.",
  },
  swordsman: {
    id: "swordsman", name: "Swordsman", strength: 12, moves: 2, cost: 20, attack: "melee", range: 1,
    requiresTech: "ironWorking", obsoletedBy: null, canBeAttacked: true,
    description: "Upgraded Warrior.",
  },
};

export const UNIT_UPGRADES: Partial<Record<UnitTypeId, UnitTypeId>> = {
  warrior: "swordsman",
};

export const STARTING_UNITS: UnitTypeId[] = ["settler", "warrior"];
