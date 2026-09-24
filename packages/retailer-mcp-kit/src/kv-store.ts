import type { Category, SourceId } from "@quickcart/contracts";
import type { RetailerCatalogItem } from "./seed-types.js";
import { effectivePrice, etaMinutesOf, type LiveItem, type StoredCart, type StoredOrder, type StoredOrderItem } from "./store.js";
import type { RetailerStorePort } from "./store-port.js";

/**
 * The minimal shape of Cloudflare's real `KVNamespace` binding this class actually uses —
 * declared locally rather than depending on `@cloudflare/workers-types` from this package
 * (which is also consumed by the Node deployment that never touches this class at all). The
 * Workers app that constructs a `KvRetailerStore` passes its real binding straight in; it
 * happens to satisfy this interface already.
 */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

const catalogKey = (sourceId: SourceId) => `${sourceId}:catalog`;
const cartKey = (sourceId: SourceId, cartId: string) => `${sourceId}:cart:${cartId}`;
const orderKey = (sourceId: SourceId, orderId: string) => `${sourceId}:order:${orderId}`;

/**
 * Workers KV-backed `RetailerStorePort` — the Cloudflare deployment's counterpart to
 * `RetailerStore`. The whole catalogue lives under one KV key (read-modify-write per
 * operation) rather than one key per product: free-tier KV bills per read/write, and a
 * ~14-item catalogue fits trivially in a single value, so this is both the cheapest and the
 * simplest option. **Not** a substitute for Durable Objects/D1 under real concurrent
 * checkout traffic — no transactional guarantee across two simultaneous requests — which is
 * an accepted, documented limitation for this free-tier demo (see
 * `CLOUDFLARE-MIGRATION-PLAN.md`), not an oversight.
 */
export class KvRetailerStore implements RetailerStorePort {
  readonly sourceId: SourceId;
  readonly categories: Category[];

  constructor(
    private readonly kv: KVNamespaceLike,
    sourceId: SourceId,
    categories: Category[],
  ) {
    this.sourceId = sourceId;
    this.categories = categories;
  }

  /** One-time (or repeatable/idempotent) load of the seed catalogue into KV — see `scripts/seed-kv.ts`. */
  static async seed(kv: KVNamespaceLike, sourceId: SourceId, items: RetailerCatalogItem[]): Promise<void> {
    const catalog: LiveItem[] = items.map((item) => ({ ...item, liveStockQty: item.stockQty }));
    await kv.put(catalogKey(sourceId), JSON.stringify(catalog));
  }

  private async loadCatalog(): Promise<LiveItem[]> {
    const raw = await this.kv.get(catalogKey(this.sourceId));
    return raw ? (JSON.parse(raw) as LiveItem[]) : [];
  }

  private async saveCatalog(catalog: LiveItem[]): Promise<void> {
    await this.kv.put(catalogKey(this.sourceId), JSON.stringify(catalog));
  }

  async listAll(): Promise<LiveItem[]> {
    return this.loadCatalog();
  }

  async find(sourceProductId: string): Promise<LiveItem | null> {
    const catalog = await this.loadCatalog();
    return catalog.find((i) => i.sourceProductId === sourceProductId) ?? null;
  }

  async search(query: string, limit: number): Promise<LiveItem[]> {
    const q = query.trim().toLowerCase();
    const all = await this.loadCatalog();
    if (!q) return all.slice(0, limit);
    const terms = q.split(/\s+/).filter(Boolean);
    return all
      .map((item) => {
        const haystack = `${item.title} ${item.brand} ${item.packSize} ${item.categoryId} ${item.canonicalSku}`.toLowerCase().replace(/-/g, " ");
        const hits = terms.filter((t) => haystack.includes(t)).length;
        return { item, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map((s) => s.item);
  }

  async byCategory(categoryId: string, cursor: string | null, limit: number): Promise<{ page: LiveItem[]; nextCursor: string | null }> {
    const all = (await this.loadCatalog()).filter((p) => p.categoryId === categoryId);
    const start = cursor ? Number(cursor) : 0;
    const page = all.slice(start, start + limit);
    const nextIndex = start + limit;
    return { page, nextCursor: nextIndex < all.length ? String(nextIndex) : null };
  }

  async createCart(pincode: string): Promise<string> {
    const cartId = `${this.sourceId}_cart_${crypto.randomUUID()}`;
    const cart: StoredCart = { cartId, pincode, lines: [], createdAt: new Date().toISOString() };
    await this.kv.put(cartKey(this.sourceId, cartId), JSON.stringify(cart));
    return cartId;
  }

  async addToCart(cartId: string, sourceProductId: string, qty: number): Promise<StoredCart> {
    const raw = await this.kv.get(cartKey(this.sourceId, cartId));
    if (!raw) throw new Error(`unknown_cart:${cartId}`);
    const cart = JSON.parse(raw) as StoredCart;
    const product = await this.find(sourceProductId);
    if (!product) throw new Error(`unknown_product:${sourceProductId}`);

    const unitPricePaise = effectivePrice(product);
    const existing = cart.lines.find((l) => l.sourceProductId === sourceProductId);
    if (existing) existing.qty += qty;
    else cart.lines.push({ sourceProductId, qty, unitPricePaise, title: product.title });

    await this.kv.put(cartKey(this.sourceId, cartId), JSON.stringify(cart));
    return cart;
  }

  /** Re-verifies stock line-by-line against the KV catalogue, reserves it, and records an order. */
  async checkout(cartId: string): Promise<StoredOrder> {
    const raw = await this.kv.get(cartKey(this.sourceId, cartId));
    if (!raw) throw new Error(`unknown_cart:${cartId}`);
    const cart = JSON.parse(raw) as StoredCart;

    const items: StoredOrderItem[] = cart.lines.map((l) => ({
      sourceProductId: l.sourceProductId,
      title: l.title,
      qty: l.qty,
      unitPricePaise: l.unitPricePaise,
    }));

    const catalog = await this.loadCatalog();
    const byId = new Map(catalog.map((p) => [p.sourceProductId, p]));

    for (const line of cart.lines) {
      const product = byId.get(line.sourceProductId);
      if (!product || (product.liveStockQty !== null && product.liveStockQty < line.qty)) {
        return this.recordOrder(cartId, "REJECTED", items, 0, null);
      }
    }

    let totalPaise = 0;
    let maxEta = 0;
    for (const line of cart.lines) {
      const product = byId.get(line.sourceProductId)!;
      if (product.liveStockQty !== null) product.liveStockQty -= line.qty;
      totalPaise += line.unitPricePaise * line.qty + product.deliveryFeePaise;
      maxEta = Math.max(maxEta, etaMinutesOf(product));
    }
    await this.saveCatalog(catalog);
    return this.recordOrder(cartId, "CONFIRMED", items, totalPaise, maxEta);
  }

  async getOrder(orderId: string): Promise<StoredOrder | null> {
    const raw = await this.kv.get(orderKey(this.sourceId, orderId));
    return raw ? (JSON.parse(raw) as StoredOrder) : null;
  }

  private async recordOrder(
    cartId: string,
    status: "CONFIRMED" | "REJECTED",
    items: StoredOrderItem[],
    totalPaise: number,
    etaMinutes: number | null,
  ): Promise<StoredOrder> {
    const order: StoredOrder = {
      orderId: `${this.sourceId}_ord_${crypto.randomUUID()}`,
      cartId,
      status,
      items,
      totalPaise,
      etaMinutes,
      createdAt: new Date().toISOString(),
    };
    await this.kv.put(orderKey(this.sourceId, order.orderId), JSON.stringify(order));
    return order;
  }
}
