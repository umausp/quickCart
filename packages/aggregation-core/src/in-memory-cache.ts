import type { CachePort } from "./ports.js";

interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * A Redis-shaped, in-process cache — same `CachePort` a real Redis client would implement,
 * so swapping one in later (for a horizontally-scaled deployment, where cache must be
 * shared across instances) touches only the provider wiring, never the calling code.
 */
export class InMemoryOfferCache implements CachePort {
  private readonly store = new Map<string, Entry>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
