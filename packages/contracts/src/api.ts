import { z } from "zod";
import { OfferSchema, RankedOfferSchema } from "./offer.js";
import { SourceIdSchema } from "./source.js";

/**
 * UI-valid response DTOs produced by the Transform layer (`apps/api/src/transform`).
 * These are exactly what List/Detail render — no further shaping happens client-side
 * beyond formatting (₹, relative time).
 */

/** One card on the Home/List screen — a canonical product plus its ranked-best offer. */
export const SearchResultCardSchema = z.object({
  canonicalSku: z.string(),
  title: z.string(),
  brand: z.string(),
  packSize: z.string(),
  image: z.string(),
  category: z.string(),
  best: RankedOfferSchema,
  sourcesQueried: z.number().int(),
  sourcesReturned: z.number().int(),
});
export type SearchResultCard = z.infer<typeof SearchResultCardSchema>;

export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(SearchResultCardSchema),
});
export type SearchResponse = z.infer<typeof SearchResponseSchema>;

/** The "Compare N sources" block on the Detail screen (Doc 05 §6). */
export const ProductOffersResponseSchema = z.object({
  canonicalSku: z.string(),
  title: z.string(),
  brand: z.string(),
  packSize: z.string(),
  category: z.string(),
  image: z.string(),
  description: z.string(),
  best: SourceIdSchema.nullable(),
  sourcesQueried: z.number().int(),
  sourcesReturned: z.number().int(),
  offers: z.array(RankedOfferSchema),
  /** Sources that responded but are out of stock here — shown as a visible "excluded" row
   * (Doc 01's Detail mockup: "Flipkart · Out of stock in your area"), not silently dropped. */
  excludedOffers: z.array(OfferSchema),
});
export type ProductOffersResponse = z.infer<typeof ProductOffersResponseSchema>;

export const RankingModeSchema = z.enum(["balanced", "fastest", "cheapest", "top_rated"]);
export type RankingMode = z.infer<typeof RankingModeSchema>;

export const HomeCategorySchema = z.object({ id: z.string(), name: z.string(), icon: z.string() });
export type HomeCategory = z.infer<typeof HomeCategorySchema>;

export const HomeResponseSchema = z.object({
  categories: z.array(HomeCategorySchema),
  deals: z.array(SearchResultCardSchema),
});
export type HomeResponse = z.infer<typeof HomeResponseSchema>;

/**
 * The **Search landing** screen (Doc 01's tab bar has a dedicated Search tab, distinct from
 * Home) — recent + trending queries and category shortcuts, shown before the shopper has
 * typed anything. Submitting a query navigates to the **Search results** screen, which is
 * `SearchResponseSchema` above rendered the same way the List screen renders it.
 */
export const SearchSuggestionSchema = z.object({ query: z.string(), icon: z.string() });
export type SearchSuggestion = z.infer<typeof SearchSuggestionSchema>;

export const SearchLandingResponseSchema = z.object({
  recent: z.array(SearchSuggestionSchema),
  trending: z.array(SearchSuggestionSchema),
  categories: z.array(HomeCategorySchema),
});
export type SearchLandingResponse = z.infer<typeof SearchLandingResponseSchema>;
