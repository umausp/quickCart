import { Controller, Get, Headers, Inject, NotFoundException, Param, Query } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import type { JwtClaims, ProductOffersResponse, SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { JWT_PORT } from "../auth/auth.tokens.js";
import type { JwtPort } from "../auth/jwt-port.js";
import { TransformService } from "../transform/transform.service.js";
import { ZeptoOAuthService } from "../zepto/zepto-oauth.service.js";
import { getRealZeptoProduct, parseZeptoLiveCanonicalSku } from "../zepto/zepto-mcp-adapter.js";
import { weightsForMode } from "./ranking-mode.js";

/**
 * `GET /v1/products/:sku/offers` — the Detail screen's "Compare N sources" block. No mock
 * data: a `ZEPTO-LIVE-*` sku (the only kind `/v1/search` can produce now) is refetched live
 * from the connected shopper's real Zepto account — there's nothing to "compare" against yet
 * (one real source), so this is a single-offer response rather than a ranked multi-source one.
 */
@Controller("products")
export class ProductController {
  constructor(
    @Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway,
    private readonly transform: TransformService,
    private readonly zepto: ZeptoOAuthService,
    @Inject(JWT_PORT) private readonly jwt: JwtPort,
  ) {}

  @Get(":sku/offers")
  async offers(
    @Param("sku") sku: string,
    @Query("mode") mode?: string,
    @Headers("authorization") authHeader?: string,
  ): Promise<ProductOffersResponse> {
    const productVariantId = parseZeptoLiveCanonicalSku(sku);
    if (productVariantId) return this.realZeptoOffers(sku, productVariantId, authHeader, mode);

    const meta = this.aggregation.getCanonicalMeta(sku);
    if (!meta) throw new NotFoundException({ error: "unknown_sku", sku });
    const { results, sourcesQueried, sourcesReturned } = await this.aggregation.getOffersForSku(sku, { pincode: "560001" });
    const products: SourceProduct[] = results.map((r) => r.value).filter((v): v is SourceProduct => Boolean(v));
    return this.transform.buildProductOffersResponse(meta, products, sourcesQueried, sourcesReturned, weightsForMode(mode));
  }

  private async realZeptoOffers(sku: string, productVariantId: string, authHeader?: string, mode?: string): Promise<ProductOffersResponse> {
    const accessToken = await this.getValidZeptoToken(authHeader);
    if (!accessToken) throw new NotFoundException({ error: "unknown_sku", sku });

    const product = await getRealZeptoProduct(accessToken, productVariantId);
    if (!product) throw new NotFoundException({ error: "unknown_sku", sku });

    const meta = { canonicalSku: product.canonicalSku, title: product.title, brand: product.brand, category: product.category, packSize: product.packSize, image: product.image };
    return this.transform.buildProductOffersResponse(meta, [product], 1, 1, weightsForMode(mode));
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
