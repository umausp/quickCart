import {
  DEFAULT_RANKING_WEIGHTS,
  type CanonicalProduct,
  type ProductOffersResponse,
  type RankingWeights,
  type SearchResponse,
  type SearchResultCard,
  type SourceProduct,
} from "@quickcart/contracts";
import { groupByCanonicalSku } from "./group.js";
import { toOffer } from "./normalize.js";
import { rankOffers } from "./rank.js";

/**
 * The Transform layer's job in one function: take the raw, unranked listings the
 * Aggregation layer fetched, and turn them into exactly the JSON the List/Search-results
 * screen renders — one card per canonical product, each already carrying its ranked-best
 * offer (Doc 05 §6 / Doc 01's "Compare N sources" bindings table).
 */
export function buildSearchResponse(
  query: string,
  products: SourceProduct[],
  sourcesQueried: number,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): SearchResponse {
  const groups = groupByCanonicalSku(products);
  const results: SearchResultCard[] = [];

  for (const [canonicalSku, group] of groups) {
    const ranked = rankOffers(group.map(toOffer), weights);
    if (ranked.length === 0) continue; // every source had it out of stock — nothing to show
    const sample = group[0]!;
    results.push({
      canonicalSku,
      title: sample.title,
      brand: sample.brand,
      packSize: sample.packSize,
      image: sample.image,
      category: sample.category,
      best: ranked[0]!,
      sourcesQueried,
      sourcesReturned: group.length,
    });
  }

  results.sort((a, b) => b.best.score - a.best.score);
  return { query, results };
}

/** The Detail screen's "Compare N sources" block (Doc 05 §6 / Doc 01). */
export function buildProductOffersResponse(
  canonicalMeta: CanonicalProduct,
  products: SourceProduct[],
  sourcesQueried: number,
  sourcesReturned: number,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS,
): ProductOffersResponse {
  const allOffers = products.map(toOffer);
  const ranked = rankOffers(allOffers, weights);
  const excludedOffers = allOffers.filter((o) => !o.inStock);
  const description = products.find((p) => p.description)?.description ?? "";
  return {
    canonicalSku: canonicalMeta.canonicalSku,
    title: canonicalMeta.title,
    brand: canonicalMeta.brand,
    packSize: canonicalMeta.packSize,
    category: canonicalMeta.category,
    image: canonicalMeta.image,
    description,
    best: ranked[0]?.source ?? null,
    sourcesQueried,
    sourcesReturned,
    offers: ranked,
    excludedOffers,
  };
}
