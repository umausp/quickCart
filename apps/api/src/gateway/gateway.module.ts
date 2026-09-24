import { Module } from "@nestjs/common";
import { AggregationModule } from "../aggregation/aggregation.module.js";
import { TransformModule } from "../transform/transform.module.js";
import { ProductController } from "./product.controller.js";
import { SearchController } from "./search.controller.js";

/** The Gateway/BFF layer (Doc 03 §"API Gateway / BFF") — the only module that owns public
 * HTTP controllers. Everything else in `apps/api` is a service the gateway composes. */
@Module({
  imports: [AggregationModule, TransformModule],
  controllers: [SearchController, ProductController],
})
export class GatewayModule {}
