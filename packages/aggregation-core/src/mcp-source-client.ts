import { callTool, connectMcpClient, type McpClientHandle } from "@quickcart/mcp-toolkit";
import type { McpToolName, SourceId } from "@quickcart/contracts";
import type { SourceClientFactory, SourceClientPort } from "./ports.js";

/**
 * The one and only place in this codebase that opens a real MCP session. Sessions are
 * opened lazily and reused per source; a failed connection attempt is evicted so the next
 * call retries (letting the circuit breaker's half-open state actually mean something).
 */
export class McpSourceClientFactory implements SourceClientFactory {
  private readonly handles = new Map<SourceId, Promise<McpClientHandle>>();

  constructor(
    private readonly urls: Record<SourceId, string>,
    private readonly clientName = "quickcart-aggregation",
  ) {}

  async connect(sourceId: SourceId): Promise<SourceClientPort> {
    let pending = this.handles.get(sourceId);
    if (!pending) {
      const url = this.urls[sourceId];
      pending = connectMcpClient({ sourceId, url, clientName: this.clientName }).catch((err: unknown) => {
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
