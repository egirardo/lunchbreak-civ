import type { TechId } from "./techs";
import type { Yields } from "./terrain";

export type ImprovementId = "farm" | "mine";

export interface ImprovementDef {
  id: ImprovementId;
  name: string;
  requiresTech: TechId;
  bonus: Yields;
}

export const IMPROVEMENTS: Record<ImprovementId, ImprovementDef> = {
  farm: { id: "farm", name: "Farm", requiresTech: "agriculture", bonus: { food: 1, production: 0, science: 0 } },
  mine: { id: "mine", name: "Mine", requiresTech: "mining", bonus: { food: 0, production: 1, science: 0 } },
};
