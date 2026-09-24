import { z } from "zod";
import { SourceIdSchema, FulfilmentModeSchema } from "./source.js";

/**
 * The canonical `Offer` (Doc 05 §"Normalising five different responses"). The Transform
 * layer produces these from raw `SourceProduct`s returned by the Aggregation layer; the
 * ranking algorithm (Doc 05 §"The ranking algorithm") scores and sorts them.
 */
export const OfferSchema = z.object({
  source: SourceIdSchema,
  canonicalSku: z.string(),
  sourceProductId: z.string(),
  title: z.string(),
  brand: z.string(),
  packSize: z.string(),
  image: z.string(),
  mrpPaise: z.number().int().nonnegative(),
  pricePaise: z.number().int().nonnegative(),
  deliveryFeePaise: z.number().int().nonnegative(),
  landedPaise: z.number().int().nonnegative(),
  inStock: z.boolean(),
  stockQty: z.number().int().nullable(),
  etaMinutes: z.number().int().nullable(),
  rating: z.number().min(0).max(5).nullable(),
  fulfilment: FulfilmentModeSchema,
  fetchedAt: z.string(),
});
export type Offer = z.infer<typeof OfferSchema>;

export const RankedOfferSchema = OfferSchema.extend({
  score: z.number(),
  priceScore: z.number(),
  etaScore: z.number(),
  stockScore: z.number(),
  reliabilityScore: z.number(),
});
export type RankedOffer = z.infer<typeof RankedOfferSchema>;

/** Ranking weights — tunable per surface (the Fastest / Cheapest filter chips, Doc 05 §5). */
export const RankingWeightsSchema = z.object({
  price: z.number().default(0.45),
  eta: z.number().default(0.3),
  stock: z.number().default(0.15),
  reliability: z.number().default(0.1),
});
export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = { price: 0.45, eta: 0.3, stock: 0.15, reliability: 0.1 };
export const FASTEST_WEIGHTS: RankingWeights = { price: 0.2, eta: 0.6, stock: 0.15, reliability: 0.05 };
export const CHEAPEST_WEIGHTS: RankingWeights = { price: 0.7, eta: 0.15, stock: 0.1, reliability: 0.05 };
