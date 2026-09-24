import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpToolError } from "./errors.js";

export interface McpClientHandle {
  sourceId: string;
  client: Client;
  close: () => Promise<void>;
}

/** Opens a real MCP session (JSON-RPC 2.0 over Streamable HTTP) against one retailer server. */
export async function connectMcpClient(opts: { sourceId: string; url: string; clientName: string }): Promise<McpClientHandle> {
  const client = new Client({ name: opts.clientName, version: "1.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(opts.url));
  await client.connect(transport);
  return {
    sourceId: opts.sourceId,
    client,
    close: () => transport.close(),
  };
}

/**
 * Calls one MCP tool and returns its structured result, typed. Throws `McpToolError` on any
 * transport error, tool-side error, or a response with no parsable payload — the caller
 * (aggregation-core's fan-out) is responsible for catching this per source.
 */
export async function callTool<T>(handle: McpClientHandle, toolName: string, args: Record<string, unknown>): Promise<T> {
  let result: Record<string, unknown>;
  try {
    result = (await handle.client.callTool({ name: toolName, arguments: args })) as Record<string, unknown>;
  } catch (err) {
    throw new McpToolError(handle.sourceId, toolName, "transport_error", err);
  }

  if (result.isError) {
    const content = result.content as Array<{ type: string; text?: string }> | undefined;
    const message = content?.find((c) => c.type === "text")?.text ?? "tool_error";
    throw new McpToolError(handle.sourceId, toolName, message);
  }

  if (result.structuredContent !== undefined) {
    return result.structuredContent as T;
  }

  const content = result.content as Array<{ type: string; text?: string }> | undefined;
  const textItem = content?.find((c) => c.type === "text" && typeof c.text === "string");
  if (textItem?.text) {
    try {
      return JSON.parse(textItem.text) as T;
    } catch (err) {
      throw new McpToolError(handle.sourceId, toolName, "unparsable_response", err);
    }
  }

  throw new McpToolError(handle.sourceId, toolName, "empty_response");
}
