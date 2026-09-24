import { connectMcpClient, callTool, type FetchLike } from "@quickcart/mcp-toolkit/client";
import type { CachePort } from "@quickcart/aggregation-core";
import type { SourceProduct } from "@quickcart/contracts";

/**
 * The real, live Swiggy Instamart MCP server — same integration shape as Zepto's (per-user
 * OAuth, see `swiggy-oauth.service.ts`), but the exact tool response schema below is
 * UNVERIFIED: Swiggy's own builder docs name `search_products(query, pageNumber)` as the
 * search tool (same convention as every other adaptor here), but I have not yet completed a
 * real OAuth handshake myself — that requires a human's real phone/OTP, which I can't do
 * headlessly — so I haven't seen a live response to confirm field names against. Every
 * mapping function here fails soft (returns `[]`/`null`, logs, never throws) specifically
 * because of that: once someone connects for real, check `[swiggy-mcp]` logs (`wrangler
 * tail`) against this file and fix the field names to match, the same way the Zepto adapter's
 * mapping was corrected after its first real connection.
 */

const SWIGGY_MCP_URL = "https://mcp.swiggy.com/im";

/** Best-effort shape per Swiggy's builder docs (`search_products` under Instamart) — not
 * confirmed against a live response yet. Update once one exists. */
interface SwiggySearchProduct {
  productVariantId?: string;
  id?: string;
  variantId?: string;
  name?: string;
  title?: string;
  price?: number;
  sellingPrice?: number;
  mrp?: number;
  imageUrl?: string;
  image?: string;
  packSize?: string;
  quantity?: string;
  availableQuantity?: number;
  inStock?: boolean;
}

function authedFetch(accessToken: string): FetchLike {
  return (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  };
}

export function swiggyLiveCanonicalSku(productVariantId: string): string {
  return `SWIGGY-LIVE-${productVariantId}`;
}

export function parseSwiggyLiveCanonicalSku(canonicalSku: string): string | null {
  const prefix = "SWIGGY-LIVE-";
  return canonicalSku.startsWith(prefix) ? canonicalSku.slice(prefix.length) : null;
}

function toSourceProduct(p: SwiggySearchProduct): SourceProduct | null {
  const id = p.productVariantId ?? p.id ?? p.variantId;
  const title = p.name ?? p.title;
  const price = p.price ?? p.sellingPrice;
  if (!id || !title || price == null) return null; // shape didn't match what we guessed — skip rather than emit garbage

  const inStock = p.inStock ?? (p.availableQuantity ?? 0) > 0;
  return {
    sourceId: "swiggy",
    sourceProductId: id,
    canonicalSku: swiggyLiveCanonicalSku(id),
    title,
    brand: "Swiggy Instamart",
    category: "grocery",
    packSize: p.packSize ?? p.quantity ?? "",
    image: p.imageUrl ?? p.image ?? "🛒",
    // Assumed already in paise, matching Zepto's real (confirmed) convention for a comparable
    // Indian quick-commerce API — e.g. its `mrp: 8300` meant ₹83, no ×100 needed. Unverified
    // for Swiggy specifically; if real prices come out 100x too small once connected, this is
    // the one line to fix (multiply by 100 instead).
    mrpPaise: Math.round(p.mrp ?? price),
    sellingPricePaise: Math.round(price),
    effectivePricePaise: Math.round(price),
    inStock,
    stockQty: p.availableQuantity ?? null,
    etaMinutes: 15, // Instamart's own pitch — no per-item ETA confirmed in the (unverified) response shape
    deliveryFeePaise: 0,
    rating: null,
    fulfilment: "handoff", // no real add-to-cart/checkout adapter for this yet, same reasoning as Zepto's
    fetchedAt: new Date().toISOString(),
  };
}

/** Never throws — returns `[]` on any failure (including "the real response didn't look like
 * what we guessed"), same degrade-gracefully rule as every other source in this codebase. */
export async function searchRealSwiggy(accessToken: string, query: string, limit: number): Promise<SourceProduct[]> {
  let handle;
  try {
    handle = await connectMcpClient({ sourceId: "swiggy", url: SWIGGY_MCP_URL, clientName: "quickcart-api", fetch: authedFetch(accessToken) });
  } catch (err) {
    console.error("[swiggy-mcp] connect failed:", err);
    return [];
  }

  try {
    const result = await callTool<{ products?: SwiggySearchProduct[]; items?: SwiggySearchProduct[] }>(handle, "search_products", {
      query,
      pageNumber: 1,
    });
    const raw = result.products ?? result.items ?? [];
    return raw
      .slice(0, limit)
      .map(toSourceProduct)
      .filter((p): p is SourceProduct => p !== null);
  } catch (err) {
    console.error("[swiggy-mcp] search_products failed:", err);
    return [];
  } finally {
    await handle.close().catch(() => undefined);
  }
}

export async function cachedSearchRealSwiggy(cache: CachePort, owner: { ownerUserId: string; accessToken: string }, query: string, limit: number): Promise<SourceProduct[]> {
  const cacheKey = `swiggy-live-search:${owner.ownerUserId}:${query.toLowerCase()}:${limit}`;
  const cached = await cache.get<SourceProduct[]>(cacheKey);
  if (cached) return cached;
  const results = await searchRealSwiggy(owner.accessToken, query, limit);
  await cache.set(cacheKey, results, 30);
  return results;
}
