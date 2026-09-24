import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AddToCartRequestSchema, type JwtClaims } from "@quickcart/contracts";
import { validate } from "../common/zod-validate.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CartService } from "./cart.service.js";

/** The single cart, tabbed by company — every route returns the same grouped `CartView`. */
@Controller("cart")
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  get(@CurrentUser() user: JwtClaims) {
    return this.cart.getView(user.sub);
  }

  @Post("items")
  addItem(@CurrentUser() user: JwtClaims, @Body() body: unknown) {
    return this.cart.addItem(user.sub, validate(AddToCartRequestSchema, body));
  }

  @Patch("items/:lineId")
  updateQty(@CurrentUser() user: JwtClaims, @Param("lineId") lineId: string, @Body("qty") qty: number) {
    return this.cart.updateQty(user.sub, lineId, qty);
  }

  @Delete("items/:lineId")
  removeItem(@CurrentUser() user: JwtClaims, @Param("lineId") lineId: string) {
    return this.cart.removeItem(user.sub, lineId);
  }

  @Delete()
  clear(@CurrentUser() user: JwtClaims) {
    return this.cart.clear(user.sub);
  }

  @Patch("address")
  setAddress(@CurrentUser() user: JwtClaims, @Body("addressId") addressId: string) {
    return this.cart.setAddress(user.sub, addressId);
  }
}
