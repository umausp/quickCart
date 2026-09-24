import { randomUUID } from "node:crypto";
import type { Category, SourceId } from "@quickcart/contracts";
import type { RetailerCatalogItem } from "./seed-types.js";

export type LiveItem = RetailerCatalogItem & { liveStockQty: number | null };

export interface StoredCartLine {
  sourceProductId: string;
  qty: number;
  unitPricePaise: number;
  title: string;
}
export interface StoredCart {
  cartId: string;
  pincode: string;
  lines: StoredCartLine[];
  createdAt: string;
}
export interface StoredOrderItem {
  sourceProductId: string;
  title: string;
  qty: number;
  unitPricePaise: number;
}
export interface StoredOrder {
  orderId: string;
  cartId: string;
  status: "CONFIRMED" | "REJECTED";
  items: StoredOrderItem[];
  totalPaise: number;
  etaMinutes: number | null;
  createdAt: string;
}

export function effectivePrice(item: RetailerCatalogItem): number {
  return Math.max(0, item.sellingPricePaise - (item.autoDiscountPaise ?? 0));
}

/** Marketplaces (Flipkart/Amazon) quote delivery days; quick-commerce quotes live minutes. */
export function etaMinutesOf(item: RetailerCatalogItem): number {
  if (item.etaMinutesBase != null) return jitterMinutes(item.etaMinutesBase);
  if (item.etaDays != null) return item.etaDays * 24 * 60;
  return 24 * 60;
}

export function inStockOf(item: LiveItem): boolean {
  return item.liveStockQty === null || item.liveStockQty > 0;
}

/** Small bounded jitter so "real-time" ETA doesn't look like a frozen constant. */
function jitterMinutes(base: number): number {
  const delta = Math.max(1, Math.round(base * 0.15));
  const offset = Math.floor(Math.random() * (2 * delta + 1)) - delta;
  return Math.max(3, base + offset);
}

/**
 * The whole "backend" of one retailer MCP server: a per-process, in-memory catalogue, cart
 * and order table. This is intentionally simple (no external DB) — the point of this
 * ideation build is a *real* MCP protocol surface, not a production retailer backend.
 */
export class RetailerStore {
  readonly sourceId: SourceId;
  readonly categories: Category[];
  private readonly products = new Map<string, LiveItem>();
  private readonly carts = new Map<string, StoredCart>();
  private readonly orders = new Map<string, StoredOrder>();

  constructor(sourceId: SourceId, items: RetailerCatalogItem[], categories: Category[]) {
    this.sourceId = sourceId;
    this.categories = categories;
    for (const item of items) {
      this.products.set(item.sourceProductId, { ...item, liveStockQty: item.stockQty });
    }
  }

  listAll(): LiveItem[] {
    return [...this.products.values()];
  }

  find(sourceProductId: string): LiveItem | null {
    return this.products.get(sourceProductId) ?? null;
  }

  search(query: string, limit: number): LiveItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.listAll().slice(0, limit);
    const terms = q.split(/\s+/).filter(Boolean);
    return this.listAll()
      .map((item) => {
        // canonicalSku is included so a shopper searching a plain-English category word
        // (e.g. "chips") finds products whose display title doesn't literally contain it
        // (ours says "Lay's India's Magic Masala" — the SKU "LAYS-CHIPS-52G" carries the word).
        const haystack = `${item.title} ${item.brand} ${item.packSize} ${item.categoryId} ${item.canonicalSku}`.toLowerCase().replace(/-/g, " ");
        const hits = terms.filter((t) => haystack.includes(t)).length;
        return { item, hits };
      })
      .filter((s) => s.hits > 0)
      .sort((a, b) => b.hits - a.hits)
      .slice(0, limit)
      .map((s) => s.item);
  }

  byCategory(categoryId: string, cursor: string | null, limit: number): { page: LiveItem[]; nextCursor: string | null } {
    const all = this.listAll().filter((p) => p.categoryId === categoryId);
    const start = cursor ? Number(cursor) : 0;
    const page = all.slice(start, start + limit);
    const nextIndex = start + limit;
    return { page, nextCursor: nextIndex < all.length ? String(nextIndex) : null };
  }

  createCart(pincode: string): string {
    const cartId = `${this.sourceId}_cart_${randomUUID()}`;
    this.carts.set(cartId, { cartId, pincode, lines: [], createdAt: new Date().toISOString() });
    return cartId;
  }

  addToCart(cartId: string, sourceProductId: string, qty: number): StoredCart {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`unknown_cart:${cartId}`);
    const product = this.find(sourceProductId);
    if (!product) throw new Error(`unknown_product:${sourceProductId}`);

    const unitPricePaise = effectivePrice(product);
    const existing = cart.lines.find((l) => l.sourceProductId === sourceProductId);
    if (existing) existing.qty += qty;
    else cart.lines.push({ sourceProductId, qty, unitPricePaise, title: product.title });
    return cart;
  }

  /** Re-verifies stock line-by-line, reserves it, and creates an order record — atomically, in-process. */
  checkout(cartId: string): StoredOrder {
    const cart = this.carts.get(cartId);
    if (!cart) throw new Error(`unknown_cart:${cartId}`);

    const items: StoredOrderItem[] = cart.lines.map((l) => ({
      sourceProductId: l.sourceProductId,
      title: l.title,
      qty: l.qty,
      unitPricePaise: l.unitPricePaise,
    }));

    for (const line of cart.lines) {
      const product = this.find(line.sourceProductId);
      if (!product || (product.liveStockQty !== null && product.liveStockQty < line.qty)) {
        return this.recordOrder(cartId, "REJECTED", items, 0, null);
      }
    }

    let totalPaise = 0;
    let maxEta = 0;
    for (const line of cart.lines) {
      const product = this.find(line.sourceProductId)!;
      if (product.liveStockQty !== null) product.liveStockQty -= line.qty;
      totalPaise += line.unitPricePaise * line.qty + product.deliveryFeePaise;
      maxEta = Math.max(maxEta, etaMinutesOf(product));
    }
    return this.recordOrder(cartId, "CONFIRMED", items, totalPaise, maxEta);
  }

  getOrder(orderId: string): StoredOrder | null {
    return this.orders.get(orderId) ?? null;
  }

  private recordOrder(cartId: string, status: "CONFIRMED" | "REJECTED", items: StoredOrderItem[], totalPaise: number, etaMinutes: number | null): StoredOrder {
    const order: StoredOrder = {
      orderId: `${this.sourceId}_ord_${randomUUID()}`,
      cartId,
      status,
      items,
      totalPaise,
      etaMinutes,
      createdAt: new Date().toISOString(),
    };
    this.orders.set(order.orderId, order);
    return order;
  }
}
