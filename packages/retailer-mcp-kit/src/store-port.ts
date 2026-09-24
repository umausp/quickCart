import type { Category, SourceId } from "@quickcart/contracts";
import type { LiveItem, StoredCart, StoredOrder } from "./store.js";

/**
 * The async shape every retailer store backing implements — `RetailerStore` (in-memory, the
 * Node/local deployment) and `KvRetailerStore` (Workers KV, the Cloudflare deployment) are
 * both just adapters behind this one port. `buildRetailerTools` (tools.ts) depends only on
 * this interface, never on which backing is live — the whole point of building this as a
 * port from the start (Doc: SOLID/DIP) is that swapping deployment targets touches nothing
 * above this file.
 */
export interface RetailerStorePort {
  readonly sourceId: SourceId;
  readonly categories: Category[];

  listAll(): Promise<LiveItem[]>;
  find(sourceProductId: string): Promise<LiveItem | null>;
  search(query: string, limit: number): Promise<LiveItem[]>;
  byCategory(categoryId: string, cursor: string | null, limit: number): Promise<{ page: LiveItem[]; nextCursor: string | null }>;
  createCart(pincode: string): Promise<string>;
  addToCart(cartId: string, sourceProductId: string, qty: number): Promise<StoredCart>;
  checkout(cartId: string): Promise<StoredOrder>;
  getOrder(orderId: string): Promise<StoredOrder | null>;
}
