import type { McpToolName, SourceId } from "@quickcart/contracts";
import { McpCircuitOpenError, McpDeadlineExceededError } from "@quickcart/mcp-toolkit/client";
import type { CircuitBreaker } from "./circuit-breaker.js";
import { withTimeout } from "./deadline.js";
import type { SourceClientFactory } from "./ports.js";

export interface GatherResult<T> {
  sourceId: SourceId;
  ok: boolean;
  value?: T;
  error?: string;
}

export interface GatherSummary<T> {
  results: GatherResult<T>[];
  sourcesQueried: number;
  sourcesReturned: number;
}

export interface GatherOptions {
  sources: SourceId[];
  clientFactory: SourceClientFactory;
  breaker: CircuitBreaker;
  toolName: McpToolName;
  /** Same args for every source, or a per-source builder (e.g. a different sourceProductId each). */
  args: Record<string, unknown> | ((sourceId: SourceId) => Record<string, unknown>);
  deadlineMs: number;
}

/**
 * Scatter-gathers one tool call to every source in parallel, under a hard per-source
 * deadline (Doc 05 §4 — `services/aggregation/gather.ts`). A slow or down source is dropped,
 * never waited on; the summary always reports how many of N sources actually answered so the
 * UI can show "showing N of 5 sources" instead of silently returning a partial list.
 */
export async function gatherFromSources<T>(opts: GatherOptions): Promise<GatherSummary<T>> {
  const settled = await Promise.allSettled(
    opts.sources.map(async (sourceId): Promise<T> => {
      if (opts.breaker.isOpen(sourceId)) throw new McpCircuitOpenError(sourceId, opts.toolName);
      const client = await opts.clientFactory.connect(sourceId);
      const args = typeof opts.args === "function" ? opts.args(sourceId) : opts.args;
      return withTimeout(
        client.callTool<T>(opts.toolName, args),
        opts.deadlineMs,
        () => new McpDeadlineExceededError(sourceId, opts.toolName, opts.deadlineMs),
      );
    }),
  );

  const results: GatherResult<T>[] = settled.map((s, i) => {
    const sourceId = opts.sources[i]!;
    if (s.status === "fulfilled") {
      opts.breaker.recordSuccess(sourceId);
      return { sourceId, ok: true, value: s.value };
    }
    opts.breaker.recordFailure(sourceId);
    const error = s.reason instanceof Error ? s.reason.message : String(s.reason);
    console.error(`[gather] ${sourceId}:${opts.toolName} failed:`, error);
    return { sourceId, ok: false, error };
  });

  return { results, sourcesQueried: opts.sources.length, sourcesReturned: results.filter((r) => r.ok).length };
}
