import { Inject, Module, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { AggregationGateway, InMemoryOfferCache, McpSourceClientFactory, resolveSourceUrls } from "@quickcart/aggregation-core";
import { AGGREGATION_GATEWAY } from "./aggregation.tokens.js";

/** Default warm-up zone for the ideation build — a real deployment would resolve this from
 * the request's delivery address instead of a single constant (see Doc 03's zone-scoping). */
const DEFAULT_LOCATION = { pincode: "560001" };

/**
 * The Aggregation layer's NestJS home: "only handle lots of MCPs and fetch data from there."
 * Nothing here ranks or shapes anything for the UI — see `TransformModule` for that.
 */
@Module({
  providers: [
    {
      provide: AGGREGATION_GATEWAY,
      useFactory: (): AggregationGateway =>
        new AggregationGateway({
          clientFactory: new McpSourceClientFactory(resolveSourceUrls()),
          cache: new InMemoryOfferCache(),
          location: DEFAULT_LOCATION,
        }),
    },
  ],
  exports: [AGGREGATION_GATEWAY],
})
export class AggregationModule implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(AGGREGATION_GATEWAY) private readonly gateway: AggregationGateway) {}

  async onModuleInit(): Promise<void> {
    await this.gateway.warmCatalogue();
    const { skuCount } = this.gateway.catalogueStats;
    console.log(`[aggregation] catalogue warm: ${skuCount} canonical SKUs indexed`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.gateway.close();
  }
}
