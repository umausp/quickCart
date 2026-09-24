import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import { buildCartView, emptyCart, type CartRepositoryPort } from "@quickcart/domain";
import type { AddToCartRequest, Cart, CartLine, CartView, SourceProduct } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";
import { AddressesService } from "../addresses/addresses.service.js";
import { ZeptoOAuthService } from "../zepto/zepto-oauth.service.js";
import { getCachedRealZeptoProduct } from "../zepto/zepto-mcp-adapter.js";
import { CART_REPOSITORY } from "./cart.tokens.js";

/**
 * The server-authoritative cart (plan Phase 3): every line's price/ETA snapshot is fetched
 * fresh from the source MCP server when added, never trusted from the client. One cart, many
 * companies — `buildCartView` (domain) is what turns the flat line list into the
 * company-tabbed DTO the Cart screen renders.
 */
@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY) private readonly carts: CartRepositoryPort,
    @Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway,
    private readonly addresses: AddressesService,
    private readonly zepto: ZeptoOAuthService,
  ) {}

  async getView(userId: string): Promise<CartView> {
    return buildCartView(await this.getOrCreateCart(userId));
  }

  /** The raw cart (not the grouped view) — what the Orders module's saga actually splits by source. */
  async getCart(userId: string): Promise<Cart> {
    return this.getOrCreateCart(userId);
  }

  async addItem(userId: string, req: AddToCartRequest): Promise<CartView> {
    const product = await this.fetchSourceProduct(userId, req);
    if (!product) throw new NotFoundException({ error: "unknown_product" });
    if (!product.inStock) throw new BadRequestException({ error: "out_of_stock", sourceId: req.sourceId });

    const cart = await this.getOrCreateCart(userId);
    const existing = cart.lines.find((l) => l.sourceId === req.sourceId && l.sourceProductId === req.sourceProductId);
    if (existing) {
      existing.qty += req.qty;
      // Refresh the snapshot to the live value while we're here — no reason to show stale data.
      existing.unitPricePaise = product.effectivePricePaise;
      existing.etaMinutes = product.etaMinutes;
      existing.deliveryFeePaise = product.deliveryFeePaise;
    } else {
      const line: CartLine = {
        lineId: crypto.randomUUID(),
        canonicalSku: product.canonicalSku,
        sourceId: product.sourceId,
        sourceProductId: product.sourceProductId,
        title: product.title,
        image: product.image,
        packSize: product.packSize,
        qty: req.qty,
        unitPricePaise: product.effectivePricePaise,
        mrpPaise: product.mrpPaise,
        etaMinutes: product.etaMinutes,
        deliveryFeePaise: product.deliveryFeePaise,
        substitutable: true,
        addedAt: new Date().toISOString(),
      };
      cart.lines.push(line);
    }

    return this.persist(cart);
  }

  async updateQty(userId: string, lineId: string, qty: number): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId);
    const line = cart.lines.find((l) => l.lineId === lineId);
    if (!line) throw new NotFoundException({ error: "line_not_found" });

    if (qty <= 0) {
      cart.lines = cart.lines.filter((l) => l.lineId !== lineId);
    } else {
      line.qty = qty;
    }
    return this.persist(cart);
  }

  async removeItem(userId: string, lineId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId);
    cart.lines = cart.lines.filter((l) => l.lineId !== lineId);
    return this.persist(cart);
  }

  async clear(userId: string): Promise<CartView> {
    const cart = await this.getOrCreateCart(userId);
    cart.lines = [];
    return this.persist(cart);
  }

  async setAddress(userId: string, addressId: string): Promise<CartView> {
    const address = await this.addresses.getOwned(userId, addressId);
    const cart = await this.getOrCreateCart(userId);
    cart.addressId = address.id;
    cart.pincode = address.pincode;
    return this.persist(cart);
  }

  /**
   * "zepto" resolves through a real connection whenever one is available (same rule
   * `/v1/search` already applies): the requesting user's own connection first, then the
   * shared fallback owner's (`ZeptoOAuthConfig.defaultOwnerUserId`) if they have none — never
   * the mock retailer, which has never heard of a real Zepto `productVariantId` and would 404
   * on it (which is exactly what was happening before this existed).
   *
   * "swiggy" is search-only for now: real Instamart search results exist, but there's no
   * confirmed single-product refetch tool in Swiggy's real tool set to build a
   * server-authoritative add-to-cart on top of yet (its builder docs list no `get_product`
   * equivalent, unlike Zepto's `get_product_details`) — returns `unknown_product` rather than
   * falling through to `aggregation.getSourceProduct`, which would throw (no mock swiggy
   * retailer exists to fall back to either).
   */
  private async fetchSourceProduct(userId: string, req: AddToCartRequest): Promise<SourceProduct | null> {
    if (req.sourceId === "zepto") {
      const zeptoSession = await this.zepto.getValidAccessTokenWithFallback(userId);
      if (zeptoSession) return getCachedRealZeptoProduct(this.aggregation.cache, zeptoSession.accessToken, req.sourceProductId);
    }
    if (req.sourceId === "swiggy") return null;
    return this.aggregation.getSourceProduct(req.sourceId, req.sourceProductId);
  }

  private async getOrCreateCart(userId: string): Promise<Cart> {
    const existing = await this.carts.findByUserId(userId);
    if (existing) return existing;
    const created = emptyCart(crypto.randomUUID(), userId);
    return this.carts.save(created);
  }

  private async persist(cart: Cart): Promise<CartView> {
    cart.updatedAt = new Date().toISOString();
    const saved = await this.carts.save(cart);
    return buildCartView(saved);
  }
}
