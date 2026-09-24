import { DEFAULT_RANKING_WEIGHTS, type Offer, type RankedOffer, type RankingWeights, type SourceId } from "@quickcart/contracts";

/** in-stock & ample = 1 · low = 0.6 · unknown-but-purchasable = 0.4 · out of stock = 0 (Doc 05 §5). */
function stockScoreOf(offer: Offer): number {
  if (!offer.inStock) return 0;
  if (offer.stockQty == null) return 0.4;
  return offer.stockQty > 5 ? 1 : 0.6;
}

function etaScoreOf(offer: Offer): number {
  return 1 - Math.min((offer.etaMinutes ?? 120) / 120, 1);
}

/**
 * Rolling success + rating per source, in a real deployment (Doc 05 §5 table). No production
 * history exists yet in this ideation build, so this is a static baseline that still gives
 * the "source reliability" signal real weight — quick-commerce edges out marketplaces on
 * otherwise-tied offers, matching the fact that they're the ones with a live-stock guarantee.
 */
const RELIABILITY_BASELINE: Record<SourceId, number> = {
  blinkit: 0.95,
  zepto: 0.95,
  bigbasket: 0.9,
  flipkart: 0.85,
  amazon: 0.9,
  swiggy: 0.95, // real MCP, same quick-commerce live-stock guarantee as Zepto/Blinkit
};

/**
 * "Best" is a weighted score, not just "cheapest" (Doc 05 §5 — `services/aggregation/rank.ts`).
 * Out-of-stock offers are dropped before scoring; ties break toward faster ETA, then higher
 * reliability.
 */
export function rankOffers(offers: Offer[], weights: RankingWeights = DEFAULT_RANKING_WEIGHTS): RankedOffer[] {
  const live = offers.filter((o) => o.inStock);
  if (live.length === 0) return [];

  const minLanded = Math.min(...live.map((o) => o.landedPaise));

  const scored: RankedOffer[] = live.map((offer) => {
    const priceScore = offer.landedPaise <= 0 ? 1 : minLanded / offer.landedPaise;
    const etaScore = etaScoreOf(offer);
    const stockScore = stockScoreOf(offer);
    const reliabilityScore = RELIABILITY_BASELINE[offer.source] ?? 0.8;
    const score = weights.price * priceScore + weights.eta * etaScore + weights.stock * stockScore + weights.reliability * reliabilityScore;
    return { ...offer, score, priceScore, etaScore, stockScore, reliabilityScore };
  });

  return scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const aEta = a.etaMinutes ?? Number.POSITIVE_INFINITY;
    const bEta = b.etaMinutes ?? Number.POSITIVE_INFINITY;
    if (aEta !== bEta) return aEta - bEta;
    return b.reliabilityScore - a.reliabilityScore;
  });
}
