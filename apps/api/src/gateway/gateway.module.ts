import { Module } from "@nestjs/common";
import { AggregationModule } from "../aggregation/aggregation.module.js";
import { AuthModule } from "../auth/auth.module.js";
import { TransformModule } from "../transform/transform.module.js";
import { ZeptoModule } from "../zepto/zepto.module.js";
import { ProductController } from "./product.controller.js";
import { SearchController } from "./search.controller.js";

/** The Gateway/BFF layer (Doc 03 §"API Gateway / BFF") — the only module that owns public
 * HTTP controllers. Everything else in `apps/api` is a service the gateway composes.
 * `AuthModule`/`ZeptoModule` are here (not just on authed routes) because `/search` itself is
 * auth-*optional*: a logged-in shopper with a connected real Zepto account gets live results
 * merged in; everyone else gets exactly what this route always returned. */
@Module({
  imports: [AggregationModule, TransformModule, AuthModule, ZeptoModule],
  controllers: [SearchController, ProductController],
})
export class GatewayModule {}
