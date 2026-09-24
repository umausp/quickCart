import { defineTool, type ToolDefinition } from "@quickcart/mcp-toolkit";
import {
  AddToCartInputSchema,
  AddToCartOutputSchema,
  CheckoutInputSchema,
  CheckoutOutputSchema,
  CheckStockInputSchema,
  CheckStockOutputSchema,
  CreateCartInputSchema,
  CreateCartOutputSchema,
  GetDeliveryEstimateInputSchema,
  GetDeliveryEstimateOutputSchema,
  GetOffersInputSchema,
  GetOffersOutputSchema,
  GetPriceInputSchema,
  GetPriceOutputSchema,
  GetProductInputSchema,
  GetProductOutputSchema,
  ListCategoriesInputSchema,
  ListCategoriesOutputSchema,
  ListProductsByCategoryInputSchema,
  ListProductsByCategoryOutputSchema,
  SearchProductsInputSchema,
  SearchProductsOutputSchema,
  type SourceProduct,
} from "@quickcart/contracts";
import { effectivePrice, etaMinutesOf, inStockOf, type LiveItem } from "./store.js";
import type { RetailerStorePort } from "./store-port.js";

function toSourceProduct(store: RetailerStorePort, item: LiveItem): SourceProduct {
  return {
    sourceId: store.sourceId,
    sourceProductId: item.sourceProductId,
    canonicalSku: item.canonicalSku,
    title: item.title,
    brand: item.brand,
    category: item.categoryId,
    packSize: item.packSize,
    image: item.image,
    description: item.description,
    mrpPaise: item.mrpPaise,
    sellingPricePaise: item.sellingPricePaise,
    effectivePricePaise: effectivePrice(item),
    inStock: inStockOf(item),
    stockQty: item.liveStockQty,
    etaMinutes: inStockOf(item) ? etaMinutesOf(item) : null,
    deliveryFeePaise: item.deliveryFeePaise,
    rating: item.rating,
    fulfilment: item.fulfilment,
    fetchedAt: new Date().toISOString(),
  };
}

/** Builds the unified 11-tool contract (Doc 04) against any `RetailerStorePort` — the
 * in-memory `RetailerStore` (Node deployment) or `KvRetailerStore` (Cloudflare deployment).
 * Every handler `await`s the store, so it works identically against either backing. */
export function buildRetailerTools(store: RetailerStorePort): ToolDefinition[] {
  return [
    defineTool({
      name: "search_products",
      description: "Search this retailer's catalogue by free-text query, scoped to a delivery location.",
      input: SearchProductsInputSchema,
      output: SearchProductsOutputSchema,
      handler: async ({ query, limit }) => {
        const items = await store.search(query, limit);
        return {
          sourceId: store.sourceId,
          products: items.map((item) => toSourceProduct(store, item)),
          fetchedAt: new Date().toISOString(),
        };
      },
    }),

    defineTool({
      name: "get_product",
      description: "Fetch full detail for one product by this retailer's own product id.",
      input: GetProductInputSchema,
      output: GetProductOutputSchema,
      handler: async ({ sourceProductId }) => {
        const item = await store.find(sourceProductId);
        return { product: item ? toSourceProduct(store, item) : null };
      },
    }),

    defineTool({
      name: "get_price",
      description: "Current MRP, selling price and effective (post-offer) price for a product.",
      input: GetPriceInputSchema,
      output: GetPriceOutputSchema,
      handler: async ({ sourceProductId }) => {
        const item = await mustFind(store, sourceProductId);
        return {
          mrpPaise: item.mrpPaise,
          sellingPricePaise: item.sellingPricePaise,
          effectivePricePaise: effectivePrice(item),
          currency: "INR" as const,
        };
      },
    }),

    defineTool({
      name: "check_stock",
      description: "Live, location-scoped stock for a product (shortest-TTL signal).",
      input: CheckStockInputSchema,
      output: CheckStockOutputSchema,
      handler: async ({ sourceProductId }) => {
        const item = await mustFind(store, sourceProductId);
        return {
          inStock: inStockOf(item),
          quantityAvailable: item.liveStockQty,
          maxQty: item.liveStockQty === null ? 10 : Math.min(item.liveStockQty, 10),
        };
      },
    }),

    defineTool({
      name: "get_delivery_estimate",
      description: "Real-time delivery estimate for a product at a location.",
      input: GetDeliveryEstimateInputSchema,
      output: GetDeliveryEstimateOutputSchema,
      handler: async ({ sourceProductId }) => {
        const item = await mustFind(store, sourceProductId);
        const minutes = inStockOf(item) ? etaMinutesOf(item) : null;
        return {
          minutes: item.etaMinutesBase != null ? minutes : null,
          slot: item.etaDays != null ? `${item.etaDays} day${item.etaDays > 1 ? "s" : ""}` : null,
          deliveryFeePaise: item.deliveryFeePaise,
        };
      },
    }),

    defineTool({
      name: "get_offers",
      description: "Coupons and auto-applied discounts for a product at a location.",
      input: GetOffersInputSchema,
      output: GetOffersOutputSchema,
      handler: async ({ sourceProductId }) => {
        const item = await mustFind(store, sourceProductId);
        const offers = [];
        if (item.couponCode) {
          offers.push({
            code: item.couponCode,
            type: "FLAT" as const,
            value: Math.round((item.autoDiscountPaise ?? 5000) / 100),
            minCartPaise: item.couponMinCartPaise ?? 0,
            expiresAt: undefined,
          });
        }
        if (item.autoDiscountPaise) {
          offers.push({ code: null, type: "AUTO_PERCENT" as const, value: Math.round((item.autoDiscountPaise / item.sellingPricePaise) * 100) });
        }
        return { offers, fetchedAt: new Date().toISOString(), ttlSeconds: 120 };
      },
    }),

    defineTool({
      name: "list_categories",
      description: "The category tree this retailer sells under.",
      input: ListCategoriesInputSchema,
      output: ListCategoriesOutputSchema,
      handler: async () => ({ categories: store.categories }),
    }),

    defineTool({
      name: "list_products_by_category",
      description: "Paged product listing for one category — powers browse and catalogue crawl.",
      input: ListProductsByCategoryInputSchema,
      output: ListProductsByCategoryOutputSchema,
      handler: async ({ categoryId, cursor, limit }) => {
        const { page, nextCursor } = await store.byCategory(categoryId, cursor, limit);
        return { products: page.map((item) => toSourceProduct(store, item)), nextCursor };
      },
    }),

    defineTool({
      name: "create_cart",
      description: "Open a new server-side cart on this retailer for a delivery location.",
      input: CreateCartInputSchema,
      output: CreateCartOutputSchema,
      handler: async ({ location }) => ({ cartId: await store.createCart(location.pincode) }),
    }),

    defineTool({
      name: "add_to_cart",
      description: "Add a quantity of one product to a retailer-side cart.",
      input: AddToCartInputSchema,
      output: AddToCartOutputSchema,
      handler: async ({ cartId, sourceProductId, qty }) => {
        const cart = await store.addToCart(cartId, sourceProductId, qty);
        const subtotalPaise = cart.lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
        return { cartId, lineItems: cart.lines, subtotalPaise };
      },
    }),

    defineTool({
      name: "checkout",
      description: "Place the order for everything in this retailer's cart; re-verifies stock before confirming.",
      input: CheckoutInputSchema,
      output: CheckoutOutputSchema,
      handler: async ({ cartId }) => {
        const order = await store.checkout(cartId);
        return {
          orderId: order.orderId,
          status: order.status,
          trackingUrl: `https://track.quickcart.dev/${store.sourceId}/${order.orderId}`,
          etaMinutes: order.etaMinutes,
          totalPaise: order.totalPaise,
        };
      },
    }),
  ];
}

async function mustFind(store: RetailerStorePort, sourceProductId: string): Promise<LiveItem> {
  const item = await store.find(sourceProductId);
  if (!item) throw new Error(`unknown_product:${sourceProductId}`);
  return item;
}
