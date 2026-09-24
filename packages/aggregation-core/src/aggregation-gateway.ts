import type {
  AddToCartOutput,
  CanonicalProduct,
  CheckoutOutput,
  CheckStockOutput,
  CreateCartOutput,
  Location,
  SourceId,
  SourceProduct,
} from "@quickcart/contracts";
import { SOURCE_IDS } from "@quickcart/contracts";
import { CatalogueIndex } from "./catalogue-index.js";
import { CircuitBreaker } from "./circuit-breaker.js";
import { gatherFromSources, type GatherSummary } from "./gather.js";
import type { CachePort, SourceClientFactory } from "./ports.js";

export interface AggregationGatewayOptions {
  clientFactory: SourceClientFactory;
  cache: CachePort;
  location: Location;
  deadlineMs?: number;
  breakerFailureThreshold?: number;
  breakerCooldownMs?: number;
  sources?: SourceId[];
}

/**
 * The single façade the rest of the backend calls into MCP through — "another layer should
 * only handle lots of MCPs and fetch data from there." Every method here either fans a call
 * out to every source or targets exactly one; none of them rank, format or shape anything
 * for the UI — that is the Transform layer's job (`packages/pricing-core`), one layer up.
 */
export class AggregationGateway {
  private readonly sources: SourceId[];
  private readonly breaker: CircuitBreaker;
  private readonly catalogue: CatalogueIndex;
  private readonly deadlineMs: number;

  constructor(private readonly opts: AggregationGatewayOptions) {
    this.sources = opts.sources ?? [...SOURCE_IDS];
    this.deadlineMs = opts.deadlineMs ?? 1200;
    this.breaker = new CircuitBreaker(opts.breakerFailureThreshold ?? 3, opts.breakerCooldownMs ?? 15_000);
    this.catalogue = new CatalogueIndex(this.sources, opts.clientFactory, opts.location);
  }

  /** Best-effort warm-up (Doc 03's catalogue crawl) — safe to call repeatedly; never throws. */
  async warmCatalogue(): Promise<void> {
    await this.catalogue.refresh().catch((err: unknown) => {
      console.warn("[aggregation] catalogue warm-up failed (will resolve lazily from search instead):", err);
    });
  }

  get catalogueStats(): { skuCount: number; lastRefreshedAt: string | null } {
    return { skuCount: this.catalogue.skuCount, lastRefreshedAt: this.catalogue.lastRefreshedAt };
  }

  getCanonicalMeta(canonicalSku: string): CanonicalProduct | null {
    return this.catalogue.getCanonicalMeta(canonicalSku);
  }

  /**
   * Fans `search_products` out to every source; cache-first per (query, zone) (Doc 05 §2).
   * `opts.sources` lets a caller narrow the fan-out — used to exclude the shared, unauthenticated
   * "zepto" source when the current shopper has a real, personally-connected Zepto account,
   * whose live results are fetched separately (see `apps/api/src/zepto/zepto-mcp-adapter.ts`)
   * and merged in by the caller instead. The source subset is part of the cache key so a
   * guest's 5-source result can never be served to (or pollute) a connected shopper's request.
   */
  async search(query: string, location: Location, limit = 10, opts?: { sources?: SourceId[] }): Promise<GatherSummary<SourceProduct[]>> {
    const sources = opts?.sources ?? this.sources;
    const cacheKey = `search:${location.pincode}:${query.toLowerCase()}:${sources.join(",")}`;
    const cached = await this.opts.cache.get<GatherSummary<SourceProduct[]>>(cacheKey);
    if (cached) return cached;

    const summary = await gatherFromSources<SourceProduct[]>({
      sources,
      clientFactory: this.opts.clientFactory,
      breaker: this.breaker,
      toolName: "search_products",
      args: { query, location, limit },
      deadlineMs: this.deadlineMs,
    });

    // The tool itself returns { sourceId, products, fetchedAt } — unwrap to just the products.
    const flattened: GatherSummary<SourceProduct[]> = {
      ...summary,
      results: summary.results.map((r) => ({ ...r, value: r.ok ? (r.value as unknown as { products: SourceProduct[] }).products : undefined })),
    };
    for (const r of flattened.results) if (r.ok && r.value) this.catalogue.ingest(r.value);

    await this.opts.cache.set(cacheKey, flattened, 30);
    return flattened;
  }

  /**
   * One source's current listing for one product — a single live `get_product` call, no
   * cache. Used by Cart's add-item flow: the shopper picked a specific offer on the Detail
   * screen, but the server still re-fetches it rather than trusting a client-supplied price
   * (server-authoritative cart — the plan's Phase 3 requirement).
   */
  async getSourceProduct(sourceId: SourceId, sourceProductId: string): Promise<SourceProduct | null> {
    const client = await this.opts.clientFactory.connect(sourceId);
    const { product } = await client.callTool<{ product: SourceProduct | null }>("get_product", { sourceProductId });
    if (product) this.catalogue.ingest([product]);
    return product;
  }

  /**
   * All sources' current listings for one canonical SKU — resolves each source's own
   * product id via the catalogue index, then calls `get_product` per source (one live call
   * each, since it already returns fresh price/stock/ETA — Doc 04's detail-screen hydrate).
   */
  async getOffersForSku(canonicalSku: string, location: Location): Promise<GatherSummary<SourceProduct>> {
    const sourceProductIds = this.catalogue.getSourceProductIds(canonicalSku);
    const knownSources = this.sources.filter((s) => sourceProductIds[s]);

    if (knownSources.length === 0) {
      return { results: [], sourcesQueried: 0, sourcesReturned: 0 };
    }

    const cacheKey = `offers:${location.pincode}:${canonicalSku}`;
    const cached = await this.opts.cache.get<GatherSummary<SourceProduct>>(cacheKey);
    if (cached) return cached;

    const summary = await gatherFromSources<{ product: SourceProduct | null }>({
      sources: knownSources,
      clientFactory: this.opts.clientFactory,
      breaker: this.breaker,
      toolName: "get_product",
      args: (sourceId) => ({ sourceProductId: sourceProductIds[sourceId] }),
      deadlineMs: this.deadlineMs,
    });

    const unwrapped: GatherSummary<SourceProduct> = {
      sourcesQueried: this.sources.length, // report against the full 5, not just "known" — an unknown source is as absent as a failed one
      sourcesReturned: summary.results.filter((r) => r.ok && r.value?.product).length,
      results: summary.results.map((r) => ({ ...r, value: r.ok ? (r.value?.product ?? undefined) : undefined })),
    };
    for (const r of unwrapped.results) if (r.value) this.catalogue.ingest([r.value]);

    await this.opts.cache.set(cacheKey, unwrapped, 30);
    return unwrapped;
  }

  /** Bypasses the cache — used right before checkout so a shopper never pays a stale price (Doc 05 §7). */
  async liveCheckStock(sourceId: SourceId, sourceProductId: string, location: Location): Promise<CheckStockOutput> {
    const client = await this.opts.clientFactory.connect(sourceId);
    return client.callTool<CheckStockOutput>("check_stock", { sourceProductId, location });
  }

  async createCart(sourceId: SourceId, location: Location): Promise<CreateCartOutput> {
    const client = await this.opts.clientFactory.connect(sourceId);
    return client.callTool<CreateCartOutput>("create_cart", { location });
  }

  async addToCart(sourceId: SourceId, cartId: string, sourceProductId: string, qty: number): Promise<AddToCartOutput> {
    const client = await this.opts.clientFactory.connect(sourceId);
    return client.callTool<AddToCartOutput>("add_to_cart", { cartId, sourceProductId, qty });
  }

  async checkout(sourceId: SourceId, cartId: string, address: { line1: string; city: string; pincode: string }, paymentToken: string): Promise<CheckoutOutput> {
    const client = await this.opts.clientFactory.connect(sourceId);
    return client.callTool<CheckoutOutput>("checkout", { cartId, address, paymentToken });
  }

  breakerSnapshot(): ReturnType<CircuitBreaker["snapshot"]> {
    return this.breaker.snapshot();
  }

  async close(): Promise<void> {
    await this.opts.clientFactory.closeAll();
  }
}
