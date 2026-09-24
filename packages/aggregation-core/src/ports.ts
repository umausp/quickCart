import type { McpToolName, SourceId } from "@quickcart/contracts";

/** One connected retailer session — everything the Aggregation layer needs from a source. */
export interface SourceClientPort {
  sourceId: SourceId;
  callTool<T>(toolName: McpToolName, args: Record<string, unknown>): Promise<T>;
}

/** Opens (and reuses) MCP sessions per source. The only thing in this whole codebase that is
 * allowed to know an MCP transport exists (Doc 03's "one aggregation boundary" principle). */
export interface SourceClientFactory {
  connect(sourceId: SourceId): Promise<SourceClientPort>;
  closeAll(): Promise<void>;
}

/** A Redis-shaped cache port — `InMemoryOfferCache` implements it for ideation; a real Redis
 * adapter is a drop-in replacement behind the same interface (DIP). */
export interface CachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}
