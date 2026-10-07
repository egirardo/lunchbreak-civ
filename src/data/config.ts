export const RULES = {
  mapWidth: 16,
  mapHeight: 12,
  playerCount: 3,
  maxTurns: 30,

  foodToGrow: 10,
  maxPopulation: 6,
  baseCityLimit: 4,

  cityBaseScience: 1,
  populationPerScience: 2,
  scienceFocusMultiplier: 1.5,
  cityTileProductionBonus: 1,
  riverFoodBonus: 1,

  claimRadius: 1,
  expandedClaimRadius: 2,
  expandClaimAtPopulation: 4,
  visionRadius: 2,

  cityBaseDefense: 5,
  flankingBonus: 1,

  cultureVictoryThreshold: 25,

  score: {
    perCity: 10,
    perPopulation: 1,
    perTech: 5,
    perTile: 1,
  },

  easy: {
    aiProductionMultiplier: 0.75,
    aiNoAttackBeforeTurn: 10,
  },

  maxStoredEvents: 80,
} as const;

export const PLAYER_PRESETS = [
  { name: "Azure Republic", color: "#3b7dd8", pattern: "stripes" },
  { name: "Crimson Dominion", color: "#d0453b", pattern: "dots" },
  { name: "Golden Union", color: "#d9a520", pattern: "checks" },
] as const;

export const CITY_NAMES = [
  ["Bluehaven", "Riverton", "Stonebridge", "Clearwater", "Northwatch", "Highfield"],
  ["Redcliff", "Emberfall", "Ashford", "Scarlet Keep", "Ironvale", "Duskmoor"],
  ["Goldcrest", "Sunreach", "Amberton", "Brightmere", "Harvestfold", "Dawnport"],
] as const;
