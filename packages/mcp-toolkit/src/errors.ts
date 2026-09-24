/** Raised by the fan-out client when a tool call fails, times out, or the breaker is open. */
export class McpToolError extends Error {
  constructor(
    public readonly sourceId: string,
    public readonly toolName: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`[${sourceId}:${toolName}] ${message}`);
    this.name = "McpToolError";
  }
}

export class McpDeadlineExceededError extends McpToolError {
  constructor(sourceId: string, toolName: string, ms: number) {
    super(sourceId, toolName, `deadline_exceeded (${ms}ms)`);
    this.name = "McpDeadlineExceededError";
  }
}

export class McpCircuitOpenError extends McpToolError {
  constructor(sourceId: string, toolName: string) {
    super(sourceId, toolName, "circuit_open");
    this.name = "McpCircuitOpenError";
  }
}
