import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import { SOURCE_IDS, type JwtClaims, type SearchResponse, type SourceId, type SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { JWT_PORT } from "../auth/auth.tokens.js";
import type { JwtPort } from "../auth/jwt-port.js";
import { TransformService } from "../transform/transform.service.js";
import { ZeptoOAuthService } from "../zepto/zepto-oauth.service.js";
import { searchRealZepto } from "../zepto/zepto-mcp-adapter.js";
import { weightsForMode } from "./ranking-mode.js";

const DEFAULT_PINCODE = "560001";
const NON_ZEPTO_SOURCES: SourceId[] = SOURCE_IDS.filter((s) => s !== "zepto");

/**
 * `GET /v1/search` — the List/Search-results screen's one endpoint. Composes Aggregation
 * (fetch) with Transform (rank + shape); this controller itself does neither. Auth-optional:
 * a logged-in shopper with a connected real Zepto account gets that account's live results
 * merged in in place of the shared demo "zepto" source; everyone else is unaffected.
 */
@Controller()
export class SearchController {
  constructor(
    @Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway,
    private readonly transform: TransformService,
    private readonly zepto: ZeptoOAuthService,
    @Inject(JWT_PORT) private readonly jwt: JwtPort,
  ) {}

  @Get("search")
  async search(
    @Query("q") q = "",
    @Query("pincode") pincode = DEFAULT_PINCODE,
    @Query("mode") mode?: string,
    @Query("limit") limit?: string,
    @Headers("authorization") authHeader?: string,
  ): Promise<SearchResponse> {
    const location = { pincode };
    const requestedLimit = Number(limit) || 20;
    const zeptoToken = await this.getValidZeptoToken(authHeader);

    const { results, sourcesQueried } = await this.aggregation.search(
      q,
      location,
      requestedLimit,
      zeptoToken ? { sources: NON_ZEPTO_SOURCES } : undefined,
    );
    const products: SourceProduct[] = results.flatMap((r) => r.value ?? []);

    let finalProducts = products;
    let finalSourcesQueried = sourcesQueried;
    if (zeptoToken) {
      const real = await searchRealZepto(zeptoToken, q, requestedLimit);
      finalProducts = [...products, ...real];
      finalSourcesQueried += 1;
    }

    return this.transform.buildSearchResponse(q, finalProducts, finalSourcesQueried, weightsForMode(mode));
  }

  private async getValidZeptoToken(authHeader?: string): Promise<string | null> {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
      const claims = await this.jwt.verify<JwtClaims>(token);
      return this.zepto.getValidAccessToken(claims.sub);
    } catch {
      return null;
    }
  }
}
