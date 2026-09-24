import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { toAddressSnapshot, type Order, type OrderSummary } from "@quickcart/contracts";
import type { OrderRepositoryPort } from "@quickcart/domain";
import { AddressesService } from "../addresses/addresses.service.js";
import { CartService } from "../cart/cart.service.js";
import { OrderOrchestrator } from "./orchestrator.js";
import { ORDER_REPOSITORY } from "./orders.tokens.js";

function toSummary(order: Order): OrderSummary {
  return {
    orderId: order.orderId,
    status: order.status,
    itemCount: order.subOrders.reduce((sum, s) => sum + s.items.reduce((n, i) => n + i.qty, 0), 0),
    totalPaise: order.totalCapturedPaise,
    combinedEtaMinutes: order.combinedEtaMinutes,
    sourceIds: order.subOrders.map((s) => s.sourceId),
    createdAt: order.createdAt,
  };
}

/**
 * Cart → Order composition root (Doc 06). Re-verifies nothing extra here beyond what the
 * orchestrator's `checkout` call already does per source (Doc 05 §7's live re-check happens
 * inside each retailer MCP server's own `checkout` tool — see `retailer-mcp-kit`'s
 * `RetailerStore.checkout`).
 */
@Injectable()
export class OrdersService {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orders: OrderRepositoryPort,
    private readonly cart: CartService,
    private readonly addresses: AddressesService,
    private readonly orchestrator: OrderOrchestrator,
  ) {}

  async placeOrder(userId: string, addressId: string, idempotencyKey: string): Promise<Order> {
    const existing = await this.orders.findByIdempotencyKey(idempotencyKey);
    if (existing) return existing; // retried submit — same order back, never double-placed (Doc 03/06)

    const address = await this.addresses.getOwned(userId, addressId);
    const cart = await this.cart.getCart(userId);
    if (cart.lines.length === 0) throw new BadRequestException({ error: "empty_cart" });

    const order = await this.orchestrator.placeOrder({
      userId,
      lines: cart.lines,
      address: toAddressSnapshot(address),
      location: { pincode: address.pincode },
    });

    await this.orders.create(order);
    await this.orders.saveIdempotencyKey(idempotencyKey, order.orderId);
    await this.cart.clear(userId); // ideation-scope: no partial re-add of failed lines back to the cart

    return order;
  }

  async list(userId: string): Promise<OrderSummary[]> {
    return (await this.orders.listByUser(userId)).map(toSummary);
  }

  async get(userId: string, orderId: string): Promise<Order> {
    const order = await this.orders.findById(orderId);
    if (!order || order.userId !== userId) throw new NotFoundException({ error: "order_not_found" });
    return order;
  }
}
