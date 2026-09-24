/**
 * A real, end-to-end MCP fan-out: connects to all five running retailer MCP servers over
 * Streamable HTTP (JSON-RPC 2.0), calls `search_products` on each, and prints what comes
 * back — the same call the Aggregation layer makes, minus the ranking/caching around it.
 *
 * Usage:  pnpm mcp:demo "butter"
 * Requires the five services running first: `pnpm dev:mcp` (or `pnpm --filter "./services/*" dev`).
 */
import { connectMcpClient, callTool } from "@quickcart/mcp-toolkit";
import type { SearchProductsOutput } from "@quickcart/contracts";
import type { SourceId } from "@quickcart/contracts";

const SOURCES: Array<{ sourceId: SourceId; port: number }> = [
  { sourceId: "blinkit", port: 7001 },
  { sourceId: "zepto", port: 7002 },
  { sourceId: "bigbasket", port: 7003 },
  { sourceId: "flipkart", port: 7004 },
  { sourceId: "amazon", port: 7005 },
];

async function main(): Promise<void> {
  const query = process.argv[2] ?? "butter";
  console.log(`\nFanning "${query}" out to ${SOURCES.length} real MCP servers over JSON-RPC 2.0...\n`);

  const results = await Promise.allSettled(
    SOURCES.map(async ({ sourceId, port }) => {
      const handle = await connectMcpClient({ sourceId, url: `http://localhost:${port}/mcp`, clientName: "quickcart-demo" });
      try {
        const result = await callTool<SearchProductsOutput>(handle, "search_products", {
          query,
          location: { pincode: "560001" },
          limit: 5,
        });
        return result;
      } finally {
        await handle.close();
      }
    }),
  );

  let queried = 0;
  let returned = 0;
  for (const [i, r] of results.entries()) {
    const sourceId = SOURCES[i]!.sourceId;
    queried++;
    if (r.status === "fulfilled") {
      returned++;
      console.log(`✔ ${sourceId.padEnd(10)} ${r.value.products.length} product(s)`);
      for (const prod of r.value.products) {
        console.log(`    - ${prod.title} (${prod.packSize}) ₹${prod.effectivePricePaise / 100} · ${prod.inStock ? `${prod.etaMinutes ?? "?"}min` : "OUT OF STOCK"}`);
      }
    } else {
      console.log(`✘ ${sourceId.padEnd(10)} FAILED: ${(r.reason as Error).message}`);
    }
  }
  console.log(`\nShowing ${returned} of ${queried} sources.\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
