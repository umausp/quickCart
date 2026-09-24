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
