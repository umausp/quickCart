import type { SourceId } from "@quickcart/contracts";

/**
 * A tiny per-source circuit breaker (Doc 05 §4 / §9): after `failureThreshold` consecutive
 * failures, a source is "open" for `cooldownMs` and every call fails fast with
 * `circuit_open` instead of hitting a source that's already down. After the cooldown it
 * half-opens — the next call is tried for real, and success or failure decides whether it
 * closes again or reopens.
 */
export class CircuitBreaker {
  private readonly failures = new Map<SourceId, number>();
  private readonly openUntil = new Map<SourceId, number>();

  constructor(
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 15_000,
  ) {}

  isOpen(sourceId: SourceId): boolean {
    const until = this.openUntil.get(sourceId);
    if (until === undefined) return false;
    if (Date.now() >= until) {
      // Cooldown elapsed — half-open: let the next call decide the outcome.
      this.openUntil.delete(sourceId);
      this.failures.set(sourceId, 0);
      return false;
    }
    return true;
  }

  recordSuccess(sourceId: SourceId): void {
    this.failures.set(sourceId, 0);
    this.openUntil.delete(sourceId);
  }

  recordFailure(sourceId: SourceId): void {
    const next = (this.failures.get(sourceId) ?? 0) + 1;
    this.failures.set(sourceId, next);
    if (next >= this.failureThreshold) {
      this.openUntil.set(sourceId, Date.now() + this.cooldownMs);
    }
  }

  snapshot(): Array<{ sourceId: SourceId; open: boolean; failures: number }> {
    const sources = new Set<SourceId>([...this.failures.keys(), ...this.openUntil.keys()]);
    return [...sources].map((sourceId) => ({
      sourceId,
      open: this.isOpen(sourceId),
      failures: this.failures.get(sourceId) ?? 0,
    }));
  }
}
