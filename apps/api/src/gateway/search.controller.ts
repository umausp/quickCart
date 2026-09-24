import { Controller, Get, Headers, Inject, Query } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import type { JwtClaims, SearchResponse, SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { JWT_PORT } from "../auth/auth.tokens.js";
import type { JwtPort } from "../auth/jwt-port.js";
import { TransformService } from "../transform/transform.service.js";
import { ZeptoOAuthService } from "../zepto/zepto-oauth.service.js";
import { searchRealZepto } from "../zepto/zepto-mcp-adapter.js";
import { weightsForMode } from "./ranking-mode.js";

/**
 * `GET /v1/search` — the List/Search-results screen's one endpoint. No mock data: this only
 * ever returns real MCP results. Today that means a logged-in shopper's real, connected Zepto
 * account (Zepto's own server requires auth for every call, including plain search — confirmed
 * directly against it, not a QuickCart choice); a guest, or anyone not connected, gets an
 * empty result set rather than the old shared demo catalogue. Swiggy will join this list the
 * moment QuickCart has real API access to it (currently blocked on Swiggy's own invite-based
 * application process, not anything this code controls).
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
    @Query("mode") mode?: string,
    @Query("limit") limit?: string,
    @Headers("authorization") authHeader?: string,
  ): Promise<SearchResponse> {
    const requestedLimit = Number(limit) || 20;
    const zepto = await this.getValidZeptoSession(authHeader);

    const products: SourceProduct[] = zepto ? await this.cachedSearchRealZepto(zepto, q, requestedLimit) : [];
    const sourcesQueried = zepto ? 1 : 0;

    return this.transform.buildSearchResponse(q, products, sourcesQueried, weightsForMode(mode));
  }

  private async getValidZeptoSession(authHeader?: string): Promise<{ userId: string; accessToken: string } | null> {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
      const claims = await this.jwt.verify<JwtClaims>(token);
      const accessToken = await this.zepto.getValidAccessToken(claims.sub);
      return accessToken ? { userId: claims.sub, accessToken } : null;
    } catch {
      return null;
    }
  }

  /**
   * A real Zepto search is a multi-round-trip session against an external server (initialize,
   * pick a store, search) — real, unavoidable network latency. What *is* avoidable is paying
   * that cost on every request: the home page alone re-runs the exact same `limit=8` empty-query
   * search on every load. Cached per-user (results are personal to the connected account) for
   * 30s, using the same cache instance/backing store `AggregationGateway` already owns.
   */
  private async cachedSearchRealZepto(zepto: { userId: string; accessToken: string }, query: string, limit: number): Promise<SourceProduct[]> {
    const cacheKey = `zepto-live-search:${zepto.userId}:${query.toLowerCase()}:${limit}`;
    const cached = await this.aggregation.cache.get<SourceProduct[]>(cacheKey);
    if (cached) return cached;
    const results = await searchRealZepto(zepto.accessToken, query, limit);
    await this.aggregation.cache.set(cacheKey, results, 30);
    return results;
  }
}
