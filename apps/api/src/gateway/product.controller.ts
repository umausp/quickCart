import { Controller, Get, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import type { ProductOffersResponse, SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { TransformService } from "../transform/transform.service.js";
import { weightsForMode } from "./ranking-mode.js";

const DEFAULT_PINCODE = "560001";

/** `GET /v1/products/:sku/offers` — the Detail screen's "Compare N sources" block (Doc 05 §6). */
@Controller("products")
export class ProductController {
  constructor(
    @Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway,
    private readonly transform: TransformService,
  ) {}

  @Get(":sku/offers")
  async offers(
    @Param("sku") sku: string,
    @Query("pincode") pincode = DEFAULT_PINCODE,
    @Query("mode") mode?: string,
  ): Promise<ProductOffersResponse> {
    const meta = this.aggregation.getCanonicalMeta(sku);
    if (!meta) throw new NotFoundException({ error: "unknown_sku", sku });

    const { results, sourcesQueried, sourcesReturned } = await this.aggregation.getOffersForSku(sku, { pincode });
    const products: SourceProduct[] = results.map((r) => r.value).filter((v): v is SourceProduct => Boolean(v));
    return this.transform.buildProductOffersResponse(meta, products, sourcesQueried, sourcesReturned, weightsForMode(mode));
  }
}
