/**
 * Proves the Aggregation + Transform composition end-to-end: real MCP fan-out (Aggregation)
 * piped into normalise + rank + DTO-shape (Transform) — exactly what `apps/api`'s /search
 * route will do, minus the HTTP layer.
 *
 * Usage: pnpm agg:demo "butter"
 */
import { AggregationGateway, InMemoryOfferCache, McpSourceClientFactory, resolveSourceUrls } from "@quickcart/aggregation-core";
import { buildProductOffersResponse, buildSearchResponse } from "@quickcart/pricing-core";

async function main(): Promise<void> {
  const query = process.argv[2] ?? "butter";
  const location = { pincode: "560001" };

  const gateway = new AggregationGateway({
    clientFactory: new McpSourceClientFactory(resolveSourceUrls()),
    cache: new InMemoryOfferCache(),
    location,
  });

  console.log(`\nWarming catalogue index (real list_categories + list_products_by_category crawl)...`);
  await gateway.warmCatalogue();
  console.log(`Catalogue warm: ${gateway.catalogueStats.skuCount} canonical SKUs indexed.\n`);

  console.log(`Searching "${query}"...\n`);
  const { results: gathered, sourcesQueried, sourcesReturned } = await gateway.search(query, location, 10);
  const products = gathered.flatMap((r) => r.value ?? []);
  console.log(`Fan-out: ${sourcesReturned} of ${sourcesQueried} sources responded.\n`);

  const response = buildSearchResponse(query, products, sourcesQueried);
  for (const card of response.results) {
    console.log(`▶ ${card.title} (${card.packSize}) — best: ${card.best.source} ₹${card.best.pricePaise / 100} · ${card.best.etaMinutes}min · score=${card.best.score.toFixed(3)} [${card.sourcesReturned}/${card.sourcesQueried} sources]`);
  }

  const top = response.results[0];
  if (top) {
    console.log(`\nDetail page for "${top.title}" — comparing all sources:\n`);
    const offerSummary = await gateway.getOffersForSku(top.canonicalSku, location);
    const meta = gateway.getCanonicalMeta(top.canonicalSku)!;
    const detail = buildProductOffersResponse(
      meta,
      offerSummary.results.map((r) => r.value).filter((v): v is NonNullable<typeof v> => Boolean(v)),
      offerSummary.sourcesQueried,
      offerSummary.sourcesReturned,
    );
    console.log(`Best: ${detail.best} · showing ${detail.sourcesReturned} of ${detail.sourcesQueried} sources\n`);
    for (const offer of detail.offers) {
      console.log(`  ${offer.source.padEnd(10)} ₹${offer.pricePaise / 100} + ₹${offer.deliveryFeePaise / 100} delivery = ₹${offer.landedPaise / 100} landed · ${offer.etaMinutes}min · score=${offer.score.toFixed(3)}`);
    }
  }

  await gateway.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
