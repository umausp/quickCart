/** DI token for `AggregationGateway` — every controller/service depends on this token, never
 * the concrete class, so the binding (real MCP client vs. a test double) is swappable. */
export const AGGREGATION_GATEWAY = Symbol("AGGREGATION_GATEWAY");
