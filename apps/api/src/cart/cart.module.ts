import { Module } from "@nestjs/common";
import { InMemoryCartRepository } from "@quickcart/domain";
import { AddressesModule } from "../addresses/addresses.module.js";
import { AggregationModule } from "../aggregation/aggregation.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { CartController } from "./cart.controller.js";
import { CartService } from "./cart.service.js";
import { CART_REPOSITORY } from "./cart.tokens.js";

@Module({
  imports: [AuthModule, AggregationModule, AddressesModule],
  controllers: [CartController],
  providers: [CartService, { provide: CART_REPOSITORY, useClass: InMemoryCartRepository }],
  exports: [CartService],
})
export class CartModule {}
