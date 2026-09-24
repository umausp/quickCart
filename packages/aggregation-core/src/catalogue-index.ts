import type {
  CanonicalProduct,
  Category,
  ListCategoriesOutput,
  ListProductsByCategoryOutput,
  Location,
  SourceId,
  SourceProduct,
} from "@quickcart/contracts";
import type { SourceClientFactory } from "./ports.js";

/**
 * Resolves a canonical SKU to each source's own `sourceProductId` — the mapping Doc 03 calls
 * `PRODUCT_SOURCE_MAP`. There is no persistent Catalogue database in this ideation build, so
 * the index is built the same way Doc 03 §"Missing-SKU discovery" describes a category-listing
 * crawl: real `list_categories` + `list_products_by_category` MCP calls against every source,
 * kept warm in memory. Search results also opportunistically `ingest()` into it, so a SKU is
 * resolvable as soon as it's ever been seen, not only after a full crawl.
 */
export class CatalogueIndex {
  private readonly bySkuAndSource = new Map<string, Map<SourceId, SourceProduct>>();
  private refreshedAt: string | null = null;

  constructor(
    private readonly sources: SourceId[],
    private readonly clientFactory: SourceClientFactory,
    private readonly location: Location,
  ) {}

  async refresh(): Promise<void> {
    await Promise.allSettled(this.sources.map((sourceId) => this.crawlSource(sourceId)));
    this.refreshedAt = new Date().toISOString();
  }

  ingest(products: SourceProduct[]): void {
    for (const product of products) this.upsert(product);
  }

  /** Each source's own product id for this canonical SKU, only for sources that carry it. */
  getSourceProductIds(canonicalSku: string): Partial<Record<SourceId, string>> {
    const bySource = this.bySkuAndSource.get(canonicalSku);
    if (!bySource) return {};
    const out: Partial<Record<SourceId, string>> = {};
    for (const [sourceId, product] of bySource) out[sourceId] = product.sourceProductId;
    return out;
  }

  getCanonicalMeta(canonicalSku: string): CanonicalProduct | null {
    const bySource = this.bySkuAndSource.get(canonicalSku);
    const any = bySource ? [...bySource.values()][0] : undefined;
    if (!any) return null;
    return { canonicalSku: any.canonicalSku, title: any.title, brand: any.brand, category: any.category, packSize: any.packSize, image: any.image };
  }

  get lastRefreshedAt(): string | null {
    return this.refreshedAt;
  }

  get skuCount(): number {
    return this.bySkuAndSource.size;
  }

  private async crawlSource(sourceId: SourceId): Promise<void> {
    const client = await this.clientFactory.connect(sourceId);
    const { categories } = await client.callTool<ListCategoriesOutput>("list_categories", {});
    await Promise.allSettled(categories.map((category: Category) => this.crawlCategory(sourceId, category.id)));
  }

  private async crawlCategory(sourceId: SourceId, categoryId: string): Promise<void> {
    const client = await this.clientFactory.connect(sourceId);
    let cursor: string | null = null;
    do {
      const page: ListProductsByCategoryOutput = await client.callTool<ListProductsByCategoryOutput>("list_products_by_category", {
        categoryId,
        location: this.location,
        cursor,
        limit: 50,
      });
      this.ingest(page.products);
      cursor = page.nextCursor;
    } while (cursor);
  }

  private upsert(product: SourceProduct): void {
    let bySource = this.bySkuAndSource.get(product.canonicalSku);
    if (!bySource) {
      bySource = new Map();
      this.bySkuAndSource.set(product.canonicalSku, bySource);
    }
    bySource.set(product.sourceId, product);
  }
}
