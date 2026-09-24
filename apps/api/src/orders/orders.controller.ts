import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UseGuards } from "@nestjs/common";
import { PlaceOrderRequestSchema, type JwtClaims } from "@quickcart/contracts";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { validate } from "../common/zod-validate.js";
import { OrdersService } from "./orders.service.js";

/** `POST /v1/orders` requires an `Idempotency-Key` header (Doc 03/06) — a retried submit
 * (flaky network, doubled tap) returns the same order instead of double-placing. */
@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  place(@CurrentUser() user: JwtClaims, @Body() body: unknown, @Headers("idempotency-key") idempotencyKey?: string) {
    if (!idempotencyKey) throw new BadRequestException({ error: "missing_idempotency_key" });
    const { addressId } = validate(PlaceOrderRequestSchema, body);
    return this.orders.placeOrder(user.sub, addressId, idempotencyKey);
  }

  @Get()
  list(@CurrentUser() user: JwtClaims) {
    return this.orders.list(user.sub);
  }

  @Get(":id")
  get(@CurrentUser() user: JwtClaims, @Param("id") id: string) {
    return this.orders.get(user.sub, id);
  }
}
