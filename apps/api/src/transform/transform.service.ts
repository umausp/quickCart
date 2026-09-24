import { Injectable } from "@nestjs/common";
import { buildProductOffersResponse, buildSearchResponse } from "@quickcart/pricing-core";
import type { CanonicalProduct, ProductOffersResponse, RankingWeights, SearchResponse, SourceProduct } from "@quickcart/contracts";

/**
 * The Transform layer's NestJS home: "format them and create response JSON valid for UI."
 * A thin DI seam over `pricing-core`'s pure functions — the ranking/shaping logic itself
 * lives in the package so it stays framework-agnostic and unit-testable without Nest.
 */
@Injectable()
export class TransformService {
  buildSearchResponse(query: string, products: SourceProduct[], sourcesQueried: number, weights?: RankingWeights): SearchResponse {
    return buildSearchResponse(query, products, sourcesQueried, weights);
  }

  buildProductOffersResponse(
    meta: CanonicalProduct,
    products: SourceProduct[],
    sourcesQueried: number,
    sourcesReturned: number,
    weights?: RankingWeights,
  ): ProductOffersResponse {
    return buildProductOffersResponse(meta, products, sourcesQueried, sourcesReturned, weights);
  }
}
