import { Module } from "@nestjs/common";
import { AddressesModule } from "./addresses/addresses.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { CartModule } from "./cart/cart.module.js";
import { GatewayModule } from "./gateway/gateway.module.js";
import { OrdersModule } from "./orders/orders.module.js";
import { ZeptoModule } from "./zepto/zepto.module.js";

@Module({
  imports: [GatewayModule, AuthModule, AddressesModule, CartModule, OrdersModule, ZeptoModule],
})
export class AppModule {}
