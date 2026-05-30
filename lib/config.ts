import { prisma } from "./db";
import {
  DEFAULT_WEIGHTS,
  DEFAULT_TARGET_CATEGORIES,
  DEFAULT_TARGET_CITIES,
  type ScoreWeights,
} from "./scoring";

export interface ActiveConfig {
  weights: ScoreWeights;
  targetCategories: string[];
  targetCities: string[];
}

export async function getActiveConfig(): Promise<ActiveConfig> {
  const c = await prisma.scoreConfig.findUnique({ where: { id: 1 } });
  return {
    weights: { ...DEFAULT_WEIGHTS, ...((c?.weights as Partial<ScoreWeights>) ?? {}) },
    targetCategories: c?.targetCategories ?? DEFAULT_TARGET_CATEGORIES,
    targetCities: c?.targetCities ?? DEFAULT_TARGET_CITIES,
  };
}
