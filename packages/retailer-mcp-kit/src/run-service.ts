import type { Category, SourceId } from "@quickcart/contracts";
import { startRetailerMcpServer } from "@quickcart/mcp-toolkit";
import { RetailerStore } from "./store.js";
import { buildRetailerTools } from "./tools.js";
import type { RetailerCatalogItem } from "./seed-types.js";

export interface RunRetailerServiceOptions {
  sourceId: SourceId;
  port: number;
  items: RetailerCatalogItem[];
  categories: Category[];
}

/**
 * The entire `services/mcp-<company>/src/index.ts` file is a one-line call to this: supply
 * seed data + a port, get back a real, running MCP server exposing the unified 11-tool
 * contract over Streamable HTTP.
 */
export function runRetailerService(opts: RunRetailerServiceOptions): ReturnType<typeof startRetailerMcpServer> {
  const store = new RetailerStore(opts.sourceId, opts.items, opts.categories);
  const tools = buildRetailerTools(store);
  return startRetailerMcpServer({ name: `${opts.sourceId}-mcp`, port: opts.port, tools });
}
