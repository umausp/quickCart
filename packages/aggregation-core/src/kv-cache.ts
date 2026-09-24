import type { CachePort } from "./ports.js";

/** The minimal shape of Cloudflare's real KV binding this cache uses. */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/**
 * Workers KV-backed `CachePort` — the same offer-cache role `InMemoryOfferCache` plays in
 * the Node deployment, using KV's native per-key TTL (`expirationTtl`) instead of a manual
 * expiry check. Same short TTLs as Doc 05 (price/stock ~30s) apply; KV's write quota (1000/day
 * free tier) is generous for this demo's traffic, cache writes being far less frequent than
 * reads thanks to the TTL itself.
 */
export class KvOfferCache implements CachePort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.kv.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    // KV requires expirationTtl >= 60s; clamp up rather than silently dropping the cache entry.
    await this.kv.put(key, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) });
  }
}
