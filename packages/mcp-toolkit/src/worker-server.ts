import type { ToolDefinition } from "./tool.js";

/**
 * A Workers-native reimplementation of the exact wire protocol
 * `@modelcontextprotocol/sdk`'s `StreamableHTTPServerTransport` speaks — not a shortcut, a
 * verified drop-in. The SDK's server transport requires Node's `IncomingMessage`/
 * `ServerResponse` (see its `.d.ts`), which Cloudflare Workers doesn't have; Workers only
 * speaks the Fetch API's `Request`/`Response`. Rather than risk a Node-compat shim, this
 * hand-rolls the same JSON-RPC 2.0 exchange, confirmed byte-for-byte against a running
 * `services/mcp-blinkit` instance before writing this file (see
 * `CLOUDFLARE-MIGRATION-PLAN.md`'s "wire-protocol facts" section):
 *
 *  - The SDK *client* accepts a plain `application/json` response just as happily as SSE
 *    (`streamableHttp.js` branches on `content-type` and parses either) — so this never needs
 *    to emit `text/event-stream` at all, which is what makes a stateless Workers handler
 *    tractable in the first place.
 *  - Tool-execution failures are a *successful* JSON-RPC response with `isError: true` in the
 *    result (MCP convention — matches what `packages/mcp-toolkit/src/client.ts` already
 *    expects); only genuinely malformed JSON-RPC gets the `error` envelope.
 */

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface WorkerServerInfo {
  name: string;
  version: string;
}

const JSON_HEADERS = { "content-type": "application/json" };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function toolErrorResult(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

async function dispatch(req: JsonRpcRequest, tools: ToolDefinition[], serverInfo: WorkerServerInfo): Promise<unknown> {
  switch (req.method) {
    case "initialize":
      return {
        protocolVersion: "2025-06-18",
        capabilities: { tools: { listChanged: true } },
        serverInfo,
      };

    case "tools/list":
      return {
        tools: tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: zodShapeToJsonSchema(t.input),
        })),
      };

    case "tools/call": {
      const { name, arguments: args } = (req.params ?? {}) as { name?: string; arguments?: unknown };
      const tool = tools.find((t) => t.name === name);
      if (!tool) return toolErrorResult(`MCP error -32602: Tool ${name} not found`);
      try {
        const parsedInput = tool.input.parse(args ?? {});
        const result = tool.output.parse(await tool.handler(parsedInput));
        return { structuredContent: result, content: [{ type: "text" as const, text: JSON.stringify(result) }] };
      } catch (err) {
        return toolErrorResult(`MCP error -32603: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    default:
      throw new Error(`method_not_found:${req.method}`);
  }
}

/** Minimal Zod-object → JSON-Schema for `tools/list` — good enough for tool discovery; our own
 * `aggregation-core` client never calls `tools/list` (see the migration plan), so this isn't on
 * any hot path, just protocol completeness for other MCP clients. */
function zodShapeToJsonSchema(schema: { shape: Record<string, unknown> }): Record<string, unknown> {
  return { type: "object", properties: Object.fromEntries(Object.keys(schema.shape).map((k) => [k, {}])) };
}

/**
 * The Workers `fetch` handler body for one retailer's `/mcp` route. Stateless by design (no
 * sessions, matching the Node deployment's `sessionIdGenerator: undefined`) — every request is
 * independent, which is exactly the shape Workers wants.
 */
export async function handleMcpRequest(request: Request, tools: ToolDefinition[], serverInfo: WorkerServerInfo): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" || request.method === "DELETE") {
    return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "method_not_allowed" } }, 405);
  }
  if (request.method !== "POST") {
    return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: -32000, message: "method_not_allowed" } }, 405);
  }
  if (!url.pathname.endsWith("/mcp")) {
    return jsonResponse({ error: "not_found" }, 404);
  }

  let body: JsonRpcRequest | JsonRpcRequest[];
  try {
    body = (await request.json()) as JsonRpcRequest | JsonRpcRequest[];
  } catch {
    return jsonResponse({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse_error" } }, 400);
  }

  const messages = Array.isArray(body) ? body : [body];
  const responses: unknown[] = [];

  for (const msg of messages) {
    if (msg.id === undefined) {
      // Notification (e.g. "notifications/initialized") — no response body, per JSON-RPC.
      continue;
    }
    try {
      const result = await dispatch(msg, tools, serverInfo);
      responses.push({ jsonrpc: "2.0", id: msg.id, result });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      responses.push({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message } });
    }
  }

  if (responses.length === 0) {
    // Pure notification batch — the SDK client treats 202 as "accepted, no body".
    return new Response(null, { status: 202 });
  }
  return jsonResponse(responses.length === 1 ? responses[0] : responses);
}
