import type { SourceId } from "@quickcart/contracts";

const DEFAULT_PORTS: Record<SourceId, number> = { blinkit: 7001, zepto: 7002, bigbasket: 7003, flipkart: 7004, amazon: 7005 };

/** Reads `MCP_<SOURCE>_URL` env vars, else defaults to `http://localhost:<port>/mcp` — one
 * env var per source is all a real deployment needs to change to point at a different host. */
export function resolveSourceUrls(env: NodeJS.ProcessEnv = process.env): Record<SourceId, string> {
  const out = {} as Record<SourceId, string>;
  for (const [sourceId, port] of Object.entries(DEFAULT_PORTS) as Array<[SourceId, number]>) {
    const envKey = `MCP_${sourceId.toUpperCase()}_URL`;
    out[sourceId] = env[envKey] ?? `http://localhost:${port}/mcp`;
  }
  return out;
}
