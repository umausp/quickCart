import { callTool, connectMcpClient, type FetchLike, type McpClientHandle } from "@quickcart/mcp-toolkit/client";
import type { McpToolName, SourceId } from "@quickcart/contracts";
import type { SourceClientFactory, SourceClientPort } from "./ports.js";

/**
 * The one and only place in this codebase that opens a real MCP session. Sessions are
 * opened lazily and reused per source; a failed connection attempt is evicted so the next
 * call retries (letting the circuit breaker's half-open state actually mean something).
 *
 * `fetchOverrides` lets the Workers deployment pass a Service Binding's `.fetch` per source
 * instead of the global one (Cloudflare error 1042 otherwise — see `client.ts`'s comment).
 * The Node deployment passes none and gets ordinary global `fetch` for every source.
 */
export class McpSourceClientFactory implements SourceClientFactory {
  private readonly handles = new Map<SourceId, Promise<McpClientHandle>>();

  constructor(
    // Partial, not every SourceId: sources that only ever resolve through a real, per-user
    // OAuth connection (no shared/mock retailer Worker behind them — e.g. "swiggy") have no
    // entry here at all, and are never connected through this factory in practice.
    private readonly urls: Partial<Record<SourceId, string>>,
    private readonly clientName = "quickcart-aggregation",
    private readonly fetchOverrides: Partial<Record<SourceId, FetchLike>> = {},
  ) {}

  async connect(sourceId: SourceId): Promise<SourceClientPort> {
    let pending = this.handles.get(sourceId);
    if (!pending) {
      const url = this.urls[sourceId];
      if (!url) throw new Error(`[mcp-source-client] no shared MCP URL configured for source "${sourceId}"`);
      const fetchImpl = this.fetchOverrides[sourceId];
      pending = connectMcpClient({ sourceId, url, clientName: this.clientName, fetch: fetchImpl }).catch((err: unknown) => {
        this.handles.delete(sourceId);
        throw err;
      });
      this.handles.set(sourceId, pending);
    }
    const handle = await pending;
    return {
      sourceId,
      callTool: <T>(toolName: McpToolName, args: Record<string, unknown>) => callTool<T>(handle, toolName, args),
    };
  }

  async closeAll(): Promise<void> {
    const pendings = [...this.handles.values()];
    this.handles.clear();
    for (const pending of pendings) {
      const handle = await pending.catch(() => null);
      if (handle) await handle.close();
    }
  }
}
