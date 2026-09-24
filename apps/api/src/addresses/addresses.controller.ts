import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { UpsertAddressSchema } from "@quickcart/contracts";
import { validate } from "../common/zod-validate.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import type { JwtClaims } from "@quickcart/contracts";
import { AddressesService } from "./addresses.service.js";

/** Address list / add / edit / delete / set-default — the three screens the plan added
 * alongside Cart/Checkout once "address" stopped being a bare text field. */
@Controller("addresses")
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  list(@CurrentUser() user: JwtClaims) {
    return this.addresses.list(user.sub);
  }

  @Post()
  create(@CurrentUser() user: JwtClaims, @Body() body: unknown) {
    return this.addresses.create(user.sub, validate(UpsertAddressSchema, body));
  }

  @Patch(":id")
  update(@CurrentUser() user: JwtClaims, @Param("id") id: string, @Body() body: unknown) {
    return this.addresses.update(user.sub, id, validate(UpsertAddressSchema, body));
  }

  @Delete(":id")
  delete(@CurrentUser() user: JwtClaims, @Param("id") id: string) {
    return this.addresses.delete(user.sub, id);
  }

  @Post(":id/default")
  setDefault(@CurrentUser() user: JwtClaims, @Param("id") id: string) {
    return this.addresses.setDefault(user.sub, id);
  }
}
