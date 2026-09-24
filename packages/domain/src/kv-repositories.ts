import type { Address, Cart, Order, UpsertAddressInput, User } from "@quickcart/contracts";
import type {
  AddressRepositoryPort,
  AuthStatePort,
  CartRepositoryPort,
  OrderRepositoryPort,
  UserRepositoryPort,
  ZeptoConnection,
  ZeptoConnectionPort,
  ZeptoOAuthState,
} from "./ports.js";

/** The minimal shape of Cloudflare's real `KVNamespace` binding these adapters use — declared
 * locally (not `@cloudflare/workers-types`) so this package stays free of a Workers-only
 * dependency; the real binding a Workers app passes in already satisfies this. */
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/**
 * Workers KV-backed repository adapters — same ports as `in-memory-repositories.ts`, so
 * every service (`AuthService`, `CartService`, `AddressesService`, `OrdersService`) is
 * identical across both deployments; only the provider binding differs
 * (`apps/api/src/worker.ts` vs. the Node modules). Free-tier KV has no transactions —
 * acceptable for this demo's traffic, not a substitute for D1/Durable Objects under real
 * concurrency (see `CLOUDFLARE-MIGRATION-PLAN.md`).
 */
export class KvUserRepository implements UserRepositoryPort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async findById(id: string): Promise<User | null> {
    const raw = await this.kv.get(`user:${id}`);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const id = await this.kv.get(`user-by-phone:${phone}`);
    return id ? this.findById(id) : null;
  }

  async create(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const created: User = { ...user, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    await this.kv.put(`user:${created.id}`, JSON.stringify(created));
    await this.kv.put(`user-by-phone:${created.phone}`, created.id);
    return created;
  }
}

/**
 * `KvAddressRepository` and `KvOrderRepository` both need a "list every X for this user"
 * query, which KV has no native index for. The obvious approach — `kv.list({ prefix })` over
 * per-item keys — looked right locally but was wrong in production: Cloudflare documents
 * `list()` as backed by a separate index that propagates *more slowly* than plain `get`/`put`
 * on a single key, so a `list()` scoped to a prefix can miss an item that was just `put()`
 * moments earlier in the very same request chain (confirmed live: `findById` on a freshly
 * created order returned it instantly, while `listByUser`'s `list()`-based scan of the same
 * order did not, for several seconds after). The fix used everywhere below: maintain one
 * single JSON-array key per user (`address-index:<userId>` / `order-index:<userId>`) and
 * only ever `get`/`put` that one key — no `list()` in any read path a user can hit.
 */
async function readIndex(kv: KVNamespaceLike, key: string): Promise<string[]> {
  const raw = await kv.get(key);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

async function appendToIndex(kv: KVNamespaceLike, key: string, id: string): Promise<void> {
  const ids = await readIndex(kv, key);
  ids.push(id);
  await kv.put(key, JSON.stringify(ids));
}

async function removeFromIndex(kv: KVNamespaceLike, key: string, id: string): Promise<void> {
  const ids = await readIndex(kv, key);
  await kv.put(key, JSON.stringify(ids.filter((existing) => existing !== id)));
}

export class KvAddressRepository implements AddressRepositoryPort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async listByUser(userId: string): Promise<Address[]> {
    const ids = await readIndex(this.kv, `address-index:${userId}`);
    const addresses = await Promise.all(ids.map((id) => this.findById(id)));
    return addresses.filter((a): a is Address => a !== null).sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  async findById(id: string): Promise<Address | null> {
    const raw = await this.kv.get(`address-id:${id}`);
    return raw ? (JSON.parse(raw) as Address) : null;
  }

  async create(userId: string, input: UpsertAddressInput): Promise<Address> {
    const now = new Date().toISOString();
    const isFirst = (await readIndex(this.kv, `address-index:${userId}`)).length === 0;
    const address: Address = { ...input, id: crypto.randomUUID(), userId, isDefault: input.isDefault || isFirst, createdAt: now, updatedAt: now };
    if (address.isDefault) await this.clearDefault(userId);
    await this.kv.put(`address-id:${address.id}`, JSON.stringify(address));
    await appendToIndex(this.kv, `address-index:${userId}`, address.id);
    return address;
  }

  async update(id: string, input: UpsertAddressInput): Promise<Address | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    if (input.isDefault) await this.clearDefault(existing.userId);
    const updated: Address = { ...existing, ...input, updatedAt: new Date().toISOString() };
    await this.kv.put(`address-id:${updated.id}`, JSON.stringify(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await this.kv.delete(`address-id:${id}`);
    await removeFromIndex(this.kv, `address-index:${existing.userId}`, id);
    return true;
  }

  async setDefault(userId: string, id: string): Promise<Address | null> {
    const target = await this.findById(id);
    if (!target || target.userId !== userId) return null;
    await this.clearDefault(userId);
    const updated: Address = { ...target, isDefault: true, updatedAt: new Date().toISOString() };
    await this.kv.put(`address-id:${updated.id}`, JSON.stringify(updated));
    return updated;
  }

  async getDefault(userId: string): Promise<Address | null> {
    return (await this.listByUser(userId)).find((a) => a.isDefault) ?? null;
  }

  private async clearDefault(userId: string): Promise<void> {
    for (const address of await this.listByUser(userId)) {
      if (address.isDefault) await this.kv.put(`address-id:${address.id}`, JSON.stringify({ ...address, isDefault: false }));
    }
  }
}

export class KvCartRepository implements CartRepositoryPort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async findByUserId(userId: string): Promise<Cart | null> {
    const raw = await this.kv.get(`cart:${userId}`);
    return raw ? (JSON.parse(raw) as Cart) : null;
  }

  async save(cart: Cart): Promise<Cart> {
    await this.kv.put(`cart:${cart.userId}`, JSON.stringify(cart));
    return cart;
  }
}

export class KvOrderRepository implements OrderRepositoryPort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async create(order: Order): Promise<Order> {
    await this.kv.put(`order:${order.orderId}`, JSON.stringify(order));
    await appendToIndex(this.kv, `order-index:${order.userId}`, order.orderId);
    return order;
  }

  async update(order: Order): Promise<Order> {
    await this.kv.put(`order:${order.orderId}`, JSON.stringify(order));
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    const raw = await this.kv.get(`order:${id}`);
    return raw ? (JSON.parse(raw) as Order) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const orderId = await this.kv.get(`order-idempotency:${key}`);
    return orderId ? this.findById(orderId) : null;
  }

  async saveIdempotencyKey(key: string, orderId: string): Promise<void> {
    await this.kv.put(`order-idempotency:${key}`, orderId);
  }

  async listByUser(userId: string): Promise<Order[]> {
    const ids = await readIndex(this.kv, `order-index:${userId}`);
    const orders = await Promise.all(ids.map((id) => this.findById(id)));
    return orders.filter((o): o is Order => o !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

/** Same OTP/refresh-token semantics as `InMemoryAuthStateRepository`, but actually shared
 * across isolates — see `AuthStatePort`'s doc comment for why that distinction matters here
 * specifically (unlike the other repos, this one guards a live request-to-request handshake,
 * not just data that outlives a restart). KV's native `expirationTtl` does the cleanup. */
export class KvAuthStateRepository implements AuthStatePort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async getOtp(phone: string): Promise<{ otp: string; expiresAt: number } | null> {
    const raw = await this.kv.get(`otp:${phone}`);
    return raw ? (JSON.parse(raw) as { otp: string; expiresAt: number }) : null;
  }

  async setOtp(phone: string, record: { otp: string; expiresAt: number }): Promise<void> {
    const ttl = Math.max(60, Math.ceil((record.expiresAt - Date.now()) / 1000));
    await this.kv.put(`otp:${phone}`, JSON.stringify(record), { expirationTtl: ttl });
  }

  async deleteOtp(phone: string): Promise<void> {
    await this.kv.delete(`otp:${phone}`);
  }

  async getRefreshToken(token: string): Promise<{ userId: string; expiresAt: number } | null> {
    const raw = await this.kv.get(`refresh:${token}`);
    return raw ? (JSON.parse(raw) as { userId: string; expiresAt: number }) : null;
  }

  async setRefreshToken(token: string, record: { userId: string; expiresAt: number }): Promise<void> {
    const ttl = Math.max(60, Math.ceil((record.expiresAt - Date.now()) / 1000));
    await this.kv.put(`refresh:${token}`, JSON.stringify(record), { expirationTtl: ttl });
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.kv.delete(`refresh:${token}`);
  }
}

/** Same semantics as `InMemoryZeptoConnectionRepository`; `saveState`'s short TTL and
 * `saveConnection`'s token expiry both use KV's native `expirationTtl`. */
export class KvZeptoConnectionRepository implements ZeptoConnectionPort {
  constructor(private readonly kv: KVNamespaceLike) {}

  async saveState(state: string, value: ZeptoOAuthState, ttlSeconds: number): Promise<void> {
    await this.kv.put(`zepto-oauth-state:${state}`, JSON.stringify(value), { expirationTtl: Math.max(60, ttlSeconds) });
  }

  async consumeState(state: string): Promise<ZeptoOAuthState | null> {
    const key = `zepto-oauth-state:${state}`;
    const raw = await this.kv.get(key);
    await this.kv.delete(key);
    return raw ? (JSON.parse(raw) as ZeptoOAuthState) : null;
  }

  async getConnection(userId: string): Promise<ZeptoConnection | null> {
    const raw = await this.kv.get(`zepto-connection:${userId}`);
    return raw ? (JSON.parse(raw) as ZeptoConnection) : null;
  }

  async saveConnection(userId: string, connection: ZeptoConnection): Promise<void> {
    await this.kv.put(`zepto-connection:${userId}`, JSON.stringify(connection));
  }

  async deleteConnection(userId: string): Promise<void> {
    await this.kv.delete(`zepto-connection:${userId}`);
  }
}
