import { CHEAPEST_WEIGHTS, DEFAULT_RANKING_WEIGHTS, FASTEST_WEIGHTS, type RankingWeights } from "@quickcart/contracts";

/** Maps the List screen's filter chips (Fastest / Cheapest / Balanced) to ranking weight
 * overrides (Doc 05 §5 — "these are the filter chips in Doc 01"). Unknown/omitted -> balanced. */
export function weightsForMode(mode: string | undefined): RankingWeights {
  switch (mode) {
    case "fastest":
      return FASTEST_WEIGHTS;
    case "cheapest":
      return CHEAPEST_WEIGHTS;
    default:
      return DEFAULT_RANKING_WEIGHTS;
  }
}
