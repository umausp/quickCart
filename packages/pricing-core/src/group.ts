import type { SourceProduct } from "@quickcart/contracts";

/** A single `search_products` fan-out mixes many different canonical products together
 * (five sources' listings for "butter" span Amul, Nandini, Mother Dairy…) — this clusters
 * them back into one group per canonical SKU before ranking runs on each group. */
export function groupByCanonicalSku(products: SourceProduct[]): Map<string, SourceProduct[]> {
  const groups = new Map<string, SourceProduct[]>();
  for (const product of products) {
    const existing = groups.get(product.canonicalSku);
    if (existing) existing.push(product);
    else groups.set(product.canonicalSku, [product]);
  }
  return groups;
}
