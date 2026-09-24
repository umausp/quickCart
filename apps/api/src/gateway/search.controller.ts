import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import type { SearchResponse, SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { TransformService } from "../transform/transform.service.js";
import { weightsForMode } from "./ranking-mode.js";

const DEFAULT_PINCODE = "560001";

/**
 * `GET /v1/search` — the List/Search-results screen's one endpoint. Composes Aggregation
 * (fetch) with Transform (rank + shape); this controller itself does neither.
 */
@Controller()
export class SearchController {
  constructor(
    @Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway,
    private readonly transform: TransformService,
  ) {}

  @Get("search")
  async search(
    @Query("q") q = "",
    @Query("pincode") pincode = DEFAULT_PINCODE,
    @Query("mode") mode?: string,
    @Query("limit") limit?: string,
  ): Promise<SearchResponse> {
    const location = { pincode };
    const { results, sourcesQueried } = await this.aggregation.search(q, location, Number(limit) || 20);
    const products: SourceProduct[] = results.flatMap((r) => r.value ?? []);
    return this.transform.buildSearchResponse(q, products, sourcesQueried, weightsForMode(mode));
  }
}
