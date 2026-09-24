import { handleMcpRequest } from "@quickcart/mcp-toolkit/worker";
import { buildRetailerTools, KvRetailerStore } from "@quickcart/retailer-mcp-kit/worker";
import { DEFAULT_CATEGORIES } from "@quickcart/contracts";
import { items } from "./seed.js";

const SOURCE_ID = "flipkart";

export interface Env {
  RETAILERS_KV: KVNamespace;
  SEED_TOKEN?: string;
}

/**
 * The Cloudflare Workers entrypoint for this retailer — same seed data, same 11-tool
 * contract (`buildRetailerTools`), same wire protocol (`handleMcpRequest`) as the Node
 * deployment (`src/index.ts`); only the store backing (KV instead of an in-memory Map) and
 * the transport binding (Workers `fetch` instead of Express `app.listen`) differ. See
 * CLOUDFLARE-MIGRATION-PLAN.md.
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", service: `${SOURCE_ID}-mcp`, toolCount: 11 });
    }

    if (url.pathname === "/seed" && request.method === "POST") {
      if (env.SEED_TOKEN && url.searchParams.get("token") !== env.SEED_TOKEN) {
        return Response.json({ error: "forbidden" }, { status: 403 });
      }
      await KvRetailerStore.seed(env.RETAILERS_KV, SOURCE_ID, items);
      return Response.json({ seeded: items.length, sourceId: SOURCE_ID });
    }

    const store = new KvRetailerStore(env.RETAILERS_KV, SOURCE_ID, DEFAULT_CATEGORIES);
    const tools = buildRetailerTools(store);
    return handleMcpRequest(request, tools, { name: `${SOURCE_ID}-mcp`, version: "1.0.0" });
  },
};
