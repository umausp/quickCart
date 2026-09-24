import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import type { JwtClaims, SearchResponse, SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { JWT_PORT } from "../auth/auth.tokens.js";
import type { JwtPort } from "../auth/jwt-port.js";
import { TransformService } from "../transform/transform.service.js";
import { SwiggyOAuthService } from "../swiggy/swiggy-oauth.service.js";
import { cachedSearchRealSwiggy } from "../swiggy/swiggy-mcp-adapter.js";
import { ZeptoOAuthService } from "../zepto/zepto-oauth.service.js";
import { searchRealZepto } from "../zepto/zepto-mcp-adapter.js";
import { weightsForMode } from "./ranking-mode.js";

/**
 * `GET /v1/search` — the List/Search-results screen's one endpoint. No mock data: this only
 * ever returns real MCP results, fanned out to every real provider concurrently (this is the
 * actual point of the whole project — comparing real prices across more than one real MCP
 * source in one place). A shopper's own connected account is used first per provider; a
 * visitor with none of their own falls back to that provider's shared owner connection (an
 * explicit, informed choice by each account's owner, not a default to add lightly). A
 * provider with no fallback configured and no personal connection simply contributes nothing.
 */
@Controller()
export class SearchController {
  constructor(
    @Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway,
    private readonly transform: TransformService,
    private readonly zepto: ZeptoOAuthService,
    private readonly swiggy: SwiggyOAuthService,
    @Inject(JWT_PORT) private readonly jwt: JwtPort,
  ) {}

  @Get("search")
  async search(
    @Query("q") q = "",
    @Query("mode") mode?: string,
    @Query("limit") limit?: string,
    @Headers("authorization") authHeader?: string,
  ): Promise<SearchResponse> {
    const requestedLimit = Number(limit) || 20;
    const claims = await this.claimsFrom(authHeader);

    const [zeptoSession, swiggySession] = await Promise.all([
      this.zepto.getValidAccessTokenWithFallback(claims?.sub ?? null),
      this.swiggy.getValidAccessTokenWithFallback(claims?.sub ?? null),
    ]);

    const [zeptoResults, swiggyResults] = await Promise.all([
      zeptoSession
        ? this.cached(`zepto-live-search:${zeptoSession.ownerUserId}:${q.toLowerCase()}:${requestedLimit}`, () => searchRealZepto(zeptoSession.accessToken, q, requestedLimit))
        : Promise.resolve<SourceProduct[]>([]),
      swiggySession ? cachedSearchRealSwiggy(this.aggregation.cache, swiggySession, q, requestedLimit) : Promise.resolve<SourceProduct[]>([]),
    ]);

    const products: SourceProduct[] = [...zeptoResults, ...swiggyResults];
    const sourcesQueried = (zeptoSession ? 1 : 0) + (swiggySession ? 1 : 0);

    return this.transform.buildSearchResponse(q, products, sourcesQueried, weightsForMode(mode));
  }

  private async claimsFrom(authHeader?: string): Promise<JwtClaims | null> {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    return token ? this.jwt.verify<JwtClaims>(token).catch(() => null) : null;
  }

  /**
   * A real search is a multi-round-trip session against an external server (initialize, pick
   * a store, search) — real, unavoidable network latency. What *is* avoidable is paying that
   * cost on every request: the home page alone re-runs the exact same `limit=8` empty-query
   * search on every load. Cached for 30s using the same cache instance/backing store
   * `AggregationGateway` already owns.
   */
  private async cached(cacheKey: string, fetchFn: () => Promise<SourceProduct[]>): Promise<SourceProduct[]> {
    const cached = await this.aggregation.cache.get<SourceProduct[]>(cacheKey);
    if (cached) return cached;
    const results = await fetchFn();
    await this.aggregation.cache.set(cacheKey, results, 30);
    return results;
  }
}
