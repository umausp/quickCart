import { z } from "zod";
import { LocationSchema } from "./location.js";
import { SourceProductSchema, CouponOfferSchema } from "./product.js";
import { CategorySchema } from "./category.js";
import { SourceIdSchema } from "./source.js";

/**
 * The unified 11-tool MCP contract every retailer adaptor implements (Doc 04 §"The unified
 * tool contract"). Each schema pair below is the JSON-Schema-equivalent (via Zod) input and
 * output for one MCP tool, shared by every one of the five real MCP servers and by the
 * Aggregation-layer client that calls them. `<Name>InputSchema.shape` /
 * `<Name>OutputSchema.shape` are what get passed to `McpServer.registerTool`.
 */

// ---- search_products ---------------------------------------------------------------------
export const SearchProductsInputSchema = z.object({
  // Empty string is a deliberate, valid query — "list everything" (RetailerStore.search's
  // convention, used by Home's "best deals" feed). Don't require .min(1) here.
  query: z.string(),
  location: LocationSchema,
  limit: z.number().int().positive().max(50).default(10),
});
export const SearchProductsOutputSchema = z.object({
  sourceId: SourceIdSchema,
  products: z.array(SourceProductSchema),
  fetchedAt: z.string(),
});
export type SearchProductsInput = z.infer<typeof SearchProductsInputSchema>;
export type SearchProductsOutput = z.infer<typeof SearchProductsOutputSchema>;

// ---- get_product ---------------------------------------------------------------------------
export const GetProductInputSchema = z.object({ sourceProductId: z.string() });
export const GetProductOutputSchema = z.object({ product: SourceProductSchema.nullable() });
export type GetProductInput = z.infer<typeof GetProductInputSchema>;
export type GetProductOutput = z.infer<typeof GetProductOutputSchema>;

// ---- get_price -------------------------------------------------------------------------------
export const GetPriceInputSchema = z.object({ sourceProductId: z.string(), location: LocationSchema });
export const GetPriceOutputSchema = z.object({
  mrpPaise: z.number().int(),
  sellingPricePaise: z.number().int(),
  effectivePricePaise: z.number().int(),
  currency: z.literal("INR"),
});
export type GetPriceInput = z.infer<typeof GetPriceInputSchema>;
export type GetPriceOutput = z.infer<typeof GetPriceOutputSchema>;

// ---- check_stock -----------------------------------------------------------------------------
export const CheckStockInputSchema = z.object({ sourceProductId: z.string(), location: LocationSchema });
export const CheckStockOutputSchema = z.object({
  inStock: z.boolean(),
  quantityAvailable: z.number().int().nullable(),
  maxQty: z.number().int(),
});
export type CheckStockInput = z.infer<typeof CheckStockInputSchema>;
export type CheckStockOutput = z.infer<typeof CheckStockOutputSchema>;

// ---- get_delivery_estimate ---------------------------------------------------------------------
export const GetDeliveryEstimateInputSchema = z.object({ sourceProductId: z.string(), location: LocationSchema });
export const GetDeliveryEstimateOutputSchema = z.object({
  minutes: z.number().int().nullable(),
  slot: z.string().nullable(),
  deliveryFeePaise: z.number().int(),
});
export type GetDeliveryEstimateInput = z.infer<typeof GetDeliveryEstimateInputSchema>;
export type GetDeliveryEstimateOutput = z.infer<typeof GetDeliveryEstimateOutputSchema>;

// ---- get_offers (coupons / auto-discounts) ------------------------------------------------------
export const GetOffersInputSchema = z.object({ sourceProductId: z.string(), location: LocationSchema });
export const GetOffersOutputSchema = z.object({
  offers: z.array(CouponOfferSchema),
  fetchedAt: z.string(),
  ttlSeconds: z.number().int(),
});
export type GetOffersInput = z.infer<typeof GetOffersInputSchema>;
export type GetOffersOutput = z.infer<typeof GetOffersOutputSchema>;

// ---- list_categories --------------------------------------------------------------------------
export const ListCategoriesInputSchema = z.object({});
export const ListCategoriesOutputSchema = z.object({ categories: z.array(CategorySchema) });
export type ListCategoriesInput = z.infer<typeof ListCategoriesInputSchema>;
export type ListCategoriesOutput = z.infer<typeof ListCategoriesOutputSchema>;

// ---- list_products_by_category ------------------------------------------------------------------
export const ListProductsByCategoryInputSchema = z.object({
  categoryId: z.string(),
  location: LocationSchema,
  cursor: z.string().nullable().default(null),
  limit: z.number().int().positive().max(50).default(20),
});
export const ListProductsByCategoryOutputSchema = z.object({
  products: z.array(SourceProductSchema),
  nextCursor: z.string().nullable(),
});
export type ListProductsByCategoryInput = z.infer<typeof ListProductsByCategoryInputSchema>;
export type ListProductsByCategoryOutput = z.infer<typeof ListProductsByCategoryOutputSchema>;

// ---- create_cart (write) ----------------------------------------------------------------------
export const CreateCartInputSchema = z.object({ location: LocationSchema });
export const CreateCartOutputSchema = z.object({ cartId: z.string() });
export type CreateCartInput = z.infer<typeof CreateCartInputSchema>;
export type CreateCartOutput = z.infer<typeof CreateCartOutputSchema>;

// ---- add_to_cart (write) -----------------------------------------------------------------------
export const AddToCartInputSchema = z.object({
  cartId: z.string(),
  sourceProductId: z.string(),
  qty: z.number().int().positive(),
});
export const CartLineItemSchema = z.object({
  sourceProductId: z.string(),
  title: z.string(),
  qty: z.number().int(),
  unitPricePaise: z.number().int(),
});
export const AddToCartOutputSchema = z.object({
  cartId: z.string(),
  lineItems: z.array(CartLineItemSchema),
  subtotalPaise: z.number().int(),
});
export type AddToCartInput = z.infer<typeof AddToCartInputSchema>;
export type AddToCartOutput = z.infer<typeof AddToCartOutputSchema>;

// ---- checkout (write) --------------------------------------------------------------------------
export const CheckoutAddressSchema = z.object({
  line1: z.string(),
  city: z.string(),
  pincode: z.string(),
});
export const CheckoutInputSchema = z.object({
  cartId: z.string(),
  address: CheckoutAddressSchema,
  paymentToken: z.string(),
});
export const CheckoutOutputSchema = z.object({
  orderId: z.string(),
  status: z.enum(["CONFIRMED", "REJECTED"]),
  trackingUrl: z.string(),
  etaMinutes: z.number().int().nullable(),
  totalPaise: z.number().int(),
});
export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;
export type CheckoutOutput = z.infer<typeof CheckoutOutputSchema>;

/** Every tool name in the unified contract, for iteration / typing the MCP client. */
export const MCP_TOOL_NAMES = [
  "search_products",
  "get_product",
  "get_price",
  "check_stock",
  "get_delivery_estimate",
  "get_offers",
  "list_categories",
  "list_products_by_category",
  "create_cart",
  "add_to_cart",
  "checkout",
] as const;
export type McpToolName = (typeof MCP_TOOL_NAMES)[number];
