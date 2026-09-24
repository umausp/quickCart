import express, { type Express } from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { ToolDefinition } from "./tool.js";

export interface RetailerMcpServerOptions {
  /** MCP server identity, e.g. "blinkit-mcp". */
  name: string;
  version?: string;
  port: number;
  tools: ToolDefinition[];
}

function registerTools(server: McpServer, tools: ToolDefinition[]): void {
  for (const t of tools) {
    server.registerTool(
      t.name,
      { description: t.description, inputSchema: t.input.shape, outputSchema: t.output.shape },
      async (rawArgs: unknown) => {
        const args = t.input.parse(rawArgs ?? {});
        const result = t.output.parse(await t.handler(args));
        return {
          structuredContent: result,
          content: [{ type: "text" as const, text: JSON.stringify(result) }],
        };
      },
    );
  }
}

/**
 * Boots a real, stateless MCP server over Streamable HTTP (JSON-RPC 2.0) — one plain Node
 * process per retailer, exactly like a network service you could put a load balancer in
 * front of. Each POST /mcp request gets a fresh `McpServer` instance (per the SDK's
 * stateless pattern) that registers the *same* tool set closing over shared, module-scoped
 * in-memory state — the McpServer itself carries no session state.
 */
export function startRetailerMcpServer(opts: RetailerMcpServerOptions): {
  app: Express;
  close: () => Promise<void>;
} {
  const version = opts.version ?? "1.0.0";
  const app = express();
  app.use(express.json());

  const buildServer = () => {
    const server = new McpServer({ name: opts.name, version });
    registerTools(server, opts.tools);
    return server;
  };

  app.post("/mcp", async (req, res) => {
    const server = buildServer();
    try {
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
    } catch (err) {
      console.error(`[${opts.name}] MCP request failed`, err);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "internal_error" }, id: null });
      }
    }
  });

  const methodNotAllowed = (_req: express.Request, res: express.Response) =>
    res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "method_not_allowed" }, id: null });
  app.get("/mcp", methodNotAllowed);
  app.delete("/mcp", methodNotAllowed);

  app.get("/health", (_req, res) => res.json({ status: "ok", service: opts.name, toolCount: opts.tools.length }));

  const httpServer = app.listen(opts.port, () => {
    console.log(`[${opts.name}] MCP server listening on http://localhost:${opts.port}/mcp (${opts.tools.length} tools)`);
  });

  return {
    app,
    close: () => new Promise((resolve) => httpServer.close(() => resolve())),
  };
}
