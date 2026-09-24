import type { Address, Cart, Order, UpsertAddressInput, User } from "@quickcart/contracts";

/**
 * Repository ports (Dependency Inversion — Doc 03's services own one datastore each). Every
 * one of these has an in-memory adapter below for the ideation build; swapping in a
 * PostgreSQL/Prisma adapter later means implementing the same interface, touching no
 * calling code (services in `apps/api` only ever depend on these tokens, never a concrete
 * class).
 */

export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  create(user: Omit<User, "id" | "createdAt">): Promise<User>;
}

export interface AddressRepositoryPort {
  listByUser(userId: string): Promise<Address[]>;
  findById(id: string): Promise<Address | null>;
  create(userId: string, input: UpsertAddressInput): Promise<Address>;
  update(id: string, input: UpsertAddressInput): Promise<Address | null>;
  delete(id: string): Promise<boolean>;
  setDefault(userId: string, id: string): Promise<Address | null>;
  getDefault(userId: string): Promise<Address | null>;
}

export interface CartRepositoryPort {
  findByUserId(userId: string): Promise<Cart | null>;
  save(cart: Cart): Promise<Cart>;
}

export interface OrderRepositoryPort {
  create(order: Order): Promise<Order>;
  update(order: Order): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findByIdempotencyKey(key: string): Promise<Order | null>;
  saveIdempotencyKey(key: string, orderId: string): Promise<void>;
  listByUser(userId: string): Promise<Order[]>;
}

/**
 * OTP + refresh-token storage for `AuthService` — split out from the in-process `Map`s it
 * used to hold directly. On Node those maps lived for the process's whole lifetime, which is
 * indistinguishable from a real store; on Workers each isolate is its own process, so an OTP
 * set by the isolate that handled `POST /v1/auth/otp` is invisible to whichever isolate
 * happens to handle the following `POST /v1/auth/verify` — this port (and its KV adapter)
 * is what makes that handshake actually work across two separate requests in production.
 */
export interface AuthStatePort {
  getOtp(phone: string): Promise<{ otp: string; expiresAt: number } | null>;
  setOtp(phone: string, record: { otp: string; expiresAt: number }): Promise<void>;
  deleteOtp(phone: string): Promise<void>;
  getRefreshToken(token: string): Promise<{ userId: string; expiresAt: number } | null>;
  setRefreshToken(token: string, record: { userId: string; expiresAt: number }): Promise<void>;
  deleteRefreshToken(token: string): Promise<void>;
}
