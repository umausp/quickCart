import { z } from "zod";
import { SourceIdSchema } from "./source.js";
import { FulfilmentModeSchema } from "./source.js";

/**
 * The normalised shape every MCP adaptor returns for a listing (Doc 04 §"Field mapping").
 * All money fields are integer paise. This is exactly what `search_products`, `get_product`
 * and `list_products_by_category` resolve to — the adaptor has already collapsed the
 * platform-native payload into this canonical shape before it ever leaves the server.
 */
export const SourceProductSchema = z.object({
  sourceId: SourceIdSchema,
  sourceProductId: z.string(),
  canonicalSku: z.string(),
  title: z.string(),
  brand: z.string(),
  category: z.string(),
  packSize: z.string(),
  image: z.string(),
  description: z.string().optional(),
  mrpPaise: z.number().int().nonnegative(),
  sellingPricePaise: z.number().int().nonnegative(),
  effectivePricePaise: z.number().int().nonnegative(),
  inStock: z.boolean(),
  stockQty: z.number().int().nullable(),
  etaMinutes: z.number().int().nullable(),
  deliveryFeePaise: z.number().int().nonnegative(),
  rating: z.number().min(0).max(5).nullable(),
  fulfilment: FulfilmentModeSchema,
  fetchedAt: z.string(),
});
export type SourceProduct = z.infer<typeof SourceProductSchema>;

/** A platform-independent product the shopper searches for — the thing, not the listing. */
export const CanonicalProductSchema = z.object({
  canonicalSku: z.string(),
  title: z.string(),
  brand: z.string(),
  category: z.string(),
  packSize: z.string(),
  image: z.string(),
});
export type CanonicalProduct = z.infer<typeof CanonicalProductSchema>;

export const CouponOfferSchema = z.object({
  code: z.string().nullable(),
  type: z.enum(["FLAT", "PERCENT", "AUTO_PERCENT"]),
  value: z.number(),
  minCartPaise: z.number().int().nonnegative().optional(),
  expiresAt: z.string().optional(),
});
export type CouponOffer = z.infer<typeof CouponOfferSchema>;
