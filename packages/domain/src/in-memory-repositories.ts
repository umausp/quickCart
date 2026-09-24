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

/**
 * In-process repository adapters — the ideation-scope default behind every port above. Data
 * does not survive a restart; that is an explicit, documented simplification (see README),
 * not an oversight. Each class implements exactly one port, so a future `@quickcart/domain-pg`
 * package can replace any single one without touching the others.
 */

export class InMemoryUserRepository implements UserRepositoryPort {
  private readonly byId = new Map<string, User>();
  private readonly byPhone = new Map<string, string>();

  async findById(id: string): Promise<User | null> {
    return this.byId.get(id) ?? null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const id = this.byPhone.get(phone);
    return id ? this.byId.get(id) ?? null : null;
  }

  async create(user: Omit<User, "id" | "createdAt">): Promise<User> {
    const created: User = { ...user, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    this.byId.set(created.id, created);
    this.byPhone.set(created.phone, created.id);
    return created;
  }
}

export class InMemoryAddressRepository implements AddressRepositoryPort {
  private readonly byId = new Map<string, Address>();

  async listByUser(userId: string): Promise<Address[]> {
    return [...this.byId.values()].filter((a) => a.userId === userId).sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  }

  async findById(id: string): Promise<Address | null> {
    return this.byId.get(id) ?? null;
  }

  async create(userId: string, input: UpsertAddressInput): Promise<Address> {
    const now = new Date().toISOString();
    const isFirst = !(await this.listByUser(userId)).length;
    const address: Address = { ...input, id: crypto.randomUUID(), userId, isDefault: input.isDefault || isFirst, createdAt: now, updatedAt: now };
    if (address.isDefault) await this.clearDefault(userId);
    this.byId.set(address.id, address);
    return address;
  }

  async update(id: string, input: UpsertAddressInput): Promise<Address | null> {
    const existing = this.byId.get(id);
    if (!existing) return null;
    if (input.isDefault) await this.clearDefault(existing.userId);
    const updated: Address = { ...existing, ...input, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.byId.delete(id);
  }

  async setDefault(userId: string, id: string): Promise<Address | null> {
    const target = this.byId.get(id);
    if (!target || target.userId !== userId) return null;
    await this.clearDefault(userId);
    const updated = { ...target, isDefault: true, updatedAt: new Date().toISOString() };
    this.byId.set(id, updated);
    return updated;
  }

  async getDefault(userId: string): Promise<Address | null> {
    return (await this.listByUser(userId)).find((a) => a.isDefault) ?? null;
  }

  private async clearDefault(userId: string): Promise<void> {
    for (const address of await this.listByUser(userId)) {
      if (address.isDefault) this.byId.set(address.id, { ...address, isDefault: false });
    }
  }
}

export class InMemoryCartRepository implements CartRepositoryPort {
  private readonly byUserId = new Map<string, Cart>();

  async findByUserId(userId: string): Promise<Cart | null> {
    return this.byUserId.get(userId) ?? null;
  }

  async save(cart: Cart): Promise<Cart> {
    this.byUserId.set(cart.userId, cart);
    return cart;
  }
}

export class InMemoryOrderRepository implements OrderRepositoryPort {
  private readonly byId = new Map<string, Order>();
  private readonly byIdempotencyKey = new Map<string, string>();

  async create(order: Order): Promise<Order> {
    this.byId.set(order.orderId, order);
    return order;
  }

  async update(order: Order): Promise<Order> {
    this.byId.set(order.orderId, order);
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.byId.get(id) ?? null;
  }

  async findByIdempotencyKey(key: string): Promise<Order | null> {
    const id = this.byIdempotencyKey.get(key);
    return id ? this.byId.get(id) ?? null : null;
  }

  async saveIdempotencyKey(key: string, orderId: string): Promise<void> {
    this.byIdempotencyKey.set(key, orderId);
  }

  async listByUser(userId: string): Promise<Order[]> {
    return [...this.byId.values()].filter((o) => o.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
}

export class InMemoryAuthStateRepository implements AuthStatePort {
  private readonly otps = new Map<string, { otp: string; expiresAt: number }>();
  private readonly refreshTokens = new Map<string, { userId: string; expiresAt: number }>();

  async getOtp(phone: string): Promise<{ otp: string; expiresAt: number } | null> {
    return this.otps.get(phone) ?? null;
  }

  async setOtp(phone: string, record: { otp: string; expiresAt: number }): Promise<void> {
    this.otps.set(phone, record);
  }

  async deleteOtp(phone: string): Promise<void> {
    this.otps.delete(phone);
  }

  async getRefreshToken(token: string): Promise<{ userId: string; expiresAt: number } | null> {
    return this.refreshTokens.get(token) ?? null;
  }

  async setRefreshToken(token: string, record: { userId: string; expiresAt: number }): Promise<void> {
    this.refreshTokens.set(token, record);
  }

  async deleteRefreshToken(token: string): Promise<void> {
    this.refreshTokens.delete(token);
  }
}

export class InMemoryZeptoConnectionRepository implements ZeptoConnectionPort {
  private readonly states = new Map<string, { value: ZeptoOAuthState; expiresAt: number }>();
  private readonly connections = new Map<string, ZeptoConnection>();

  async saveState(state: string, value: ZeptoOAuthState, ttlSeconds: number): Promise<void> {
    this.states.set(state, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async consumeState(state: string): Promise<ZeptoOAuthState | null> {
    const record = this.states.get(state);
    this.states.delete(state);
    if (!record || Date.now() > record.expiresAt) return null;
    return record.value;
  }

  async getConnection(userId: string): Promise<ZeptoConnection | null> {
    return this.connections.get(userId) ?? null;
  }

  async saveConnection(userId: string, connection: ZeptoConnection): Promise<void> {
    this.connections.set(userId, connection);
  }

  async deleteConnection(userId: string): Promise<void> {
    this.connections.delete(userId);
  }
}
