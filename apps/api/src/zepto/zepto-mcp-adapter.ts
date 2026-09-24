import { connectMcpClient, callTool, type FetchLike } from "@quickcart/mcp-toolkit/client";
import type { SourceProduct } from "@quickcart/contracts";

/**
 * The real, live Zepto MCP server — a genuinely different integration shape from the other
 * four sources: per-user OAuth (see `zepto-oauth.service.ts`), a *stateful* MCP session (needs
 * `get_location_serviceability` to pick a store before `search_products` works — confirmed by
 * calling the real server directly), and its own tool/response schema (`search_products`
 * happens to share a name with our adaptors' convention, but returns `{ name, price, mrp,
 * imageUrl, availableQuantity, productVariantId, ... }`, nothing like our `SourceProduct`).
 * One-off session per call (no session-id persistence) — simplest correct thing for a
 * request-scoped Worker/Node call, and this route is far lower-traffic than it would need to
 * be before that becomes worth optimizing.
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

function authedFetch(accessToken: string): FetchLike {
  return (url, init) => {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${accessToken}`);
    return fetch(url, { ...init, headers });
  };
}

function toSourceProduct(p: ZeptoSearchProduct): SourceProduct {
  const now = new Date().toISOString();
  const inStock = (p.availableQuantity ?? 0) > 0;
  return {
    sourceId: "zepto",
    sourceProductId: p.productVariantId,
    // Real Zepto items have no canonical cross-retailer SKU (there's nothing to match them
    // against in the other four sources' synthetic catalogues) — each is its own entry.
    canonicalSku: `ZEPTO-LIVE-${p.productVariantId}`,
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
    fetchedAt: now,
  };
}

/** Returns `[]` (never throws) on any failure — a dead or misbehaving real connection should
 * degrade exactly like a dead mock source does everywhere else in this codebase, not break
 * the whole search response. */
export async function searchRealZepto(accessToken: string, query: string, limit: number): Promise<SourceProduct[]> {
  const fetchImpl = authedFetch(accessToken);
  let handle;
  try {
    handle = await connectMcpClient({ sourceId: "zepto", url: ZEPTO_MCP_URL, clientName: "quickcart-api", fetch: fetchImpl });
  } catch (err) {
    console.error("[zepto-mcp] connect failed:", err);
    return [];
  }

  try {
    // Best-effort — a fresh session has no store selected, and `search_products` errors
    // without one; some sessions (e.g. one already tied to a saved address) don't need this,
    // so a failure here isn't fatal on its own.
    await callTool(handle, "get_location_serviceability", DEMO_LOCATION).catch(() => null);

    const result = await callTool<{ products?: ZeptoSearchProduct[] }>(handle, "search_products", { query, pageNumber: 1 });
    const products = result.products ?? [];
    return products.slice(0, limit).map(toSourceProduct);
  } catch (err) {
    console.error("[zepto-mcp] search_products failed:", err);
    return [];
  } finally {
    await handle.close().catch(() => undefined);
  }
}
