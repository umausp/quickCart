import type { z } from "zod";

/** Loosely-typed storage shape — every concrete tool is built through `defineTool` below,
 * which is where real type inference happens; this is just what `registerToolsOnServer`
 * iterates over, so it only needs runtime access to `.shape` / `.parse`. */
export interface ToolDefinition<TIn = unknown, TOut = unknown> {
  name: string;
  description: string;
  input: z.ZodObject<Record<string, z.ZodTypeAny>>;
  output: z.ZodObject<Record<string, z.ZodTypeAny>>;
  /** Method-shorthand (not a `(input: TIn) => ...` property) so `ToolDefinition<Specific, Out>[]`
   * can be stored as `ToolDefinition[]` — TS checks method parameters bivariantly, which is
   * exactly the escape hatch a heterogeneous tool registry needs. */
  handler(input: TIn): Promise<TOut> | TOut;
}

/**
 * A typed MCP tool definition. `input`/`output` are full Zod *object* schemas (so the
 * contracts package can share and validate them on both client and server); the two generic
 * parameters are inferred straight from whatever schemas you pass, so callers get full
 * autocomplete on `handler`'s argument and return value without having to restate the type.
 */
export function defineTool<In extends z.ZodObject<Record<string, z.ZodTypeAny>>, Out extends z.ZodObject<Record<string, z.ZodTypeAny>>>(def: {
  name: string;
  description: string;
  input: In;
  output: Out;
  handler: (input: z.infer<In>) => Promise<z.infer<Out>> | z.infer<Out>;
}): ToolDefinition<z.infer<In>, z.infer<Out>> {
  return def as unknown as ToolDefinition<z.infer<In>, z.infer<Out>>;
}
