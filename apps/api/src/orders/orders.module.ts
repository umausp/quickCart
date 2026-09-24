import { Module } from "@nestjs/common";
import { InMemoryOrderRepository } from "@quickcart/domain";
import { AddressesModule } from "../addresses/addresses.module.js";
import { AggregationModule } from "../aggregation/aggregation.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { CartModule } from "../cart/cart.module.js";
import { OrderOrchestrator } from "./orchestrator.js";
import { OrdersController } from "./orders.controller.js";
import { OrdersService } from "./orders.service.js";
import { ORDER_REPOSITORY } from "./orders.tokens.js";

@Module({
  imports: [AuthModule, AggregationModule, AddressesModule, CartModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderOrchestrator, { provide: ORDER_REPOSITORY, useClass: InMemoryOrderRepository }],
  exports: [OrdersService],
})
export class OrdersModule {}
