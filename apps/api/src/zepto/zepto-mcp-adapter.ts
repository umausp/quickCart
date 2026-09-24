import { connectMcpClient, callTool, type FetchLike, type McpClientHandle } from "@quickcart/mcp-toolkit/client";
import type { CachePort } from "@quickcart/aggregation-core";
import type { SourceProduct } from "@quickcart/contracts";

/**
 * The real, live Zepto MCP server — a genuinely different integration shape from the other
 * four sources: per-user OAuth (see `zepto-oauth.service.ts`), a *stateful* MCP session (needs
 * `get_location_serviceability` to pick a store before `search_products`/`get_product_details`
 * work — confirmed by calling the real server directly), and its own tool/response schemas,
 * nothing like our `SourceProduct`. One-off session per call (no session-id persistence) —
 * simplest correct thing for a request-scoped Worker/Node call, and this integration is far
 * lower-traffic than it would need to be before that becomes worth optimizing.
 */

const ZEPTO_MCP_URL = "https://mcp.zepto.co.in/mcp";
// Bengaluru center — matches the rest of this app's single hardcoded demo location
// (`DEFAULT_LOCATION = { pincode: "560001" }`); there's no real geolocation input anywhere
// in QuickCart today.
const DEMO_LOCATION = { latitude: 12.9716, longitude: 77.5946 };

interface ZeptoSearchProduct {
  productVariantId: string;
  name: string;
  price: number;
  mrp: number;
  imageUrl?: string;
  packSize?: string;
  availableQuantity?: number;
}

interface ZeptoProductDetail {
  productVariantId: string;
  name: string;
  brand?: string;
  category?: string;
  packSize?: string;
  images?: string[];
  mrp: number;
  sellingPrice: number;
  availableQuantity?: number;
  isInStock?: boolean;
  averageRating?: number;
}

function authedFetch(accessToken: string): FetchLike {
  return (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  };
}

/** Every real-Zepto `SourceProduct` this module produces shares this canonical-SKU
 * convention — there's no cross-retailer match for a real item, so each is its own entry.
 * Exported so the cart layer can recognise "this line came from the real account" without
 * re-deriving the same string. */
const ZEPTO_LIVE_PREFIX = "ZEPTO-LIVE-";

export function zeptoLiveCanonicalSku(productVariantId: string): string {
  return `${ZEPTO_LIVE_PREFIX}${productVariantId}`;
}

/** Inverse of `zeptoLiveCanonicalSku` — lets a route that only receives a canonical SKU (e.g.
 * `GET /v1/products/:sku/offers`) recover the real Zepto product id to refetch. */
export function parseZeptoLiveCanonicalSku(canonicalSku: string): string | null {
  return canonicalSku.startsWith(ZEPTO_LIVE_PREFIX) ? canonicalSku.slice(ZEPTO_LIVE_PREFIX.length) : null;
}

function withSession<T>(accessToken: string, fn: (handle: McpClientHandle) => Promise<T>, fallback: T): Promise<T> {
  return connectMcpClient({ sourceId: "zepto", url: ZEPTO_MCP_URL, clientName: "quickcart-api", fetch: authedFetch(accessToken) }).then(
    async (handle) => {
      try {
        await callTool(handle, "get_location_serviceability", DEMO_LOCATION).catch(() => null);
        return await fn(handle);
      } catch (err) {
        console.error("[zepto-mcp] call failed:", err);
        return fallback;
      } finally {
        await handle.close().catch(() => undefined);
      }
    },
    (err: unknown) => {
      console.error("[zepto-mcp] connect failed:", err);
      return fallback;
    },
  );
}

function fromSearchProduct(p: ZeptoSearchProduct): SourceProduct {
  const inStock = (p.availableQuantity ?? 0) > 0;
  return {
    sourceId: "zepto",
    sourceProductId: p.productVariantId,
    canonicalSku: zeptoLiveCanonicalSku(p.productVariantId),
    title: p.name,
    brand: "Zepto",
    category: "grocery",
    packSize: p.packSize ?? "",
    image: p.imageUrl ?? "🛒",
    mrpPaise: Math.round(p.mrp),
    sellingPricePaise: Math.round(p.price),
    effectivePricePaise: Math.round(p.price),
    inStock,
    stockQty: p.availableQuantity ?? null,
    etaMinutes: 10, // Zepto's own pitch is a flat "10 minutes" — no per-item ETA in this response
    deliveryFeePaise: 0,
    rating: null,
    // No checkout adapter for the real account yet (see the module doc comment) — "handoff"
    // is the existing vocabulary for "shown, but QuickCart doesn't place this order itself".
    fulfilment: "handoff",
    fetchedAt: new Date().toISOString(),
  };
}

function fromProductDetail(p: ZeptoProductDetail): SourceProduct {
  const inStock = p.isInStock ?? (p.availableQuantity ?? 0) > 0;
  return {
    sourceId: "zepto",
    sourceProductId: p.productVariantId,
    canonicalSku: zeptoLiveCanonicalSku(p.productVariantId),
    title: p.name,
    brand: p.brand ?? "Zepto",
    category: p.category ?? "grocery",
    packSize: p.packSize ?? "",
    image: p.images?.[0] ?? "🛒",
    mrpPaise: Math.round(p.mrp),
    sellingPricePaise: Math.round(p.sellingPrice),
    effectivePricePaise: Math.round(p.sellingPrice),
    inStock,
    stockQty: p.availableQuantity ?? null,
    etaMinutes: 10,
    deliveryFeePaise: 0,
    rating: p.averageRating ?? null,
    fulfilment: "handoff",
    fetchedAt: new Date().toISOString(),
  };
}

/** Returns `[]` (never throws) on any failure — a dead or misbehaving real connection should
 * degrade exactly like a dead mock source does everywhere else in this codebase, not break
 * the whole search response. */
export async function searchRealZepto(accessToken: string, query: string, limit: number): Promise<SourceProduct[]> {
  const products = await withSession(
    accessToken,
    async (handle) => {
      const result = await callTool<{ products?: ZeptoSearchProduct[] }>(handle, "search_products", { query, pageNumber: 1 });
      return result.products ?? [];
    },
    [] as ZeptoSearchProduct[],
  );
  return products.slice(0, limit).map(fromSearchProduct);
}

/** Live, single-item refetch — used by the cart's "always re-fetch fresh price/stock from the
 * source before adding" rule (same rule the mock sources already follow via `get_product`).
 * Returns `null` on any failure, mapped by the caller to the same 404 an unknown mock product
 * id already produces. */
export async function getRealZeptoProduct(accessToken: string, productVariantId: string): Promise<SourceProduct | null> {
  const detail = await withSession(
    accessToken,
    (handle) => callTool<ZeptoProductDetail>(handle, "get_product_details", { product_variant_id: productVariantId }),
    null as ZeptoProductDetail | null,
  );
  return detail ? fromProductDetail(detail) : null;
}

/**
 * `get_product_details` is a full session handshake against Zepto's real server (same cost as
 * `search_products`'s), and this ideation build's demo location is fixed, so the result isn't
 * even user-specific — caching by product id alone (not per-user) is safe and avoids redoing
 * the whole round trip on every "Add +" tap or detail-page view, which is what made both feel
 * slow. Shared by the cart (add-item) and product-detail routes.
 */
export async function getCachedRealZeptoProduct(cache: CachePort, accessToken: string, productVariantId: string): Promise<SourceProduct | null> {
  const cacheKey = `zepto-live-product:${productVariantId}`;
  const cached = await cache.get<SourceProduct>(cacheKey);
  if (cached) return cached;
  const product = await getRealZeptoProduct(accessToken, productVariantId);
  if (product) await cache.set(cacheKey, product, 30);
  return product;
}
