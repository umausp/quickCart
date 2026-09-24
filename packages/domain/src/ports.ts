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

/** In-flight PKCE handshake for one `/connections/zepto/start` call — `userId` is set when an
 * already-logged-in shopper is linking Zepto from their profile; `null` when "Continue with
 * Zepto" *is* the login (no QuickCart session exists yet), in which case `completeConnect`
 * finds-or-creates the QuickCart user itself once the real token comes back. */
export interface ZeptoOAuthState {
  codeVerifier: string;
  userId: string | null;
}

/** A live connection to one shopper's real Zepto account, obtained via real OAuth 2.1 + PKCE
 * against `auth.zepto.co.in` — see CLOUDFLARE-MIGRATION-PLAN.md / the Zepto integration notes
 * for why this is a genuinely different trust model than the other four (shared,
 * QuickCart-run, no-login) MCP sources: this token belongs to one specific human's real
 * account, calls real `mcp.zepto.co.in`, and can place real orders with their real money. */
export interface ZeptoConnection {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number;
  connectedAt: string;
}

export interface ZeptoConnectionPort {
  saveState(state: string, value: ZeptoOAuthState, ttlSeconds: number): Promise<void>;
  consumeState(state: string): Promise<ZeptoOAuthState | null>;
  getConnection(userId: string): Promise<ZeptoConnection | null>;
  saveConnection(userId: string, connection: ZeptoConnection): Promise<void>;
  deleteConnection(userId: string): Promise<void>;
}
