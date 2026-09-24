/**
 * Everything the MCP *client* side needs, and nothing else — deliberately excludes
 * `server.ts` (Express-based). `packages/aggregation-core`'s `mcp-source-client.ts` imports
 * this subpath (`@quickcart/mcp-toolkit/client`) rather than the package root, since
 * aggregation-core is reused unchanged by both the Node deployment and the Cloudflare
 * Workers deployment (`apps/api/src/worker.ts`) — the latter must never see Express.
 */
export * from "./errors.js";
export * from "./tool.js";
export * from "./client.js";
export type { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";
