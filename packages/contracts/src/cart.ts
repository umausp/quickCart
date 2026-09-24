import { z } from "zod";
import { SourceIdSchema } from "./source.js";

/**
 * A cart line references a canonical SKU plus the *chosen* source (Doc 06 §"Building a
 * cross-platform basket"). Because each line carries its own source, one cart naturally
 * spans multiple companies — that's what the tabbed cart UI groups by.
 */
export const CartLineSchema = z.object({
  lineId: z.string(),
  canonicalSku: z.string(),
  sourceId: SourceIdSchema,
  sourceProductId: z.string(),
  title: z.string(),
  image: z.string(),
  packSize: z.string(),
  qty: z.number().int().positive(),
  unitPricePaise: z.number().int().nonnegative(),
  mrpPaise: z.number().int().nonnegative(),
  etaMinutes: z.number().int().nullable(),
  deliveryFeePaise: z.number().int().nonnegative(),
  substitutable: z.boolean().default(true),
  addedAt: z.string(),
});
export type CartLine = z.infer<typeof CartLineSchema>;

export const CartSchema = z.object({
  cartId: z.string(),
  userId: z.string(),
  /** Pincode used to scope MCP search/stock/ETA calls — kept denormalised for fast reads. */
  pincode: z.string().nullable(),
  /** The saved Address (see address.ts) checkout will bill/ship to; null until the shopper picks one. */
  addressId: z.string().nullable(),
  lines: z.array(CartLineSchema),
  updatedAt: z.string(),
});
export type Cart = z.infer<typeof CartSchema>;

/** One tab in the UI — all lines for a single company plus its own subtotal & ETA. */
export const CartGroupSchema = z.object({
  sourceId: SourceIdSchema,
  label: z.string(),
  color: z.string(),
  lines: z.array(CartLineSchema),
  subtotalPaise: z.number().int(),
  deliveryFeePaise: z.number().int(),
  etaMinutes: z.number().int().nullable(),
});
export type CartGroup = z.infer<typeof CartGroupSchema>;

/** The Transform-layer DTO the Cart screen renders directly — grouped by company. */
export const CartViewSchema = z.object({
  cartId: z.string(),
  groups: z.array(CartGroupSchema),
  itemCount: z.number().int(),
  combinedSubtotalPaise: z.number().int(),
  combinedDeliveryFeePaise: z.number().int(),
  combinedTotalPaise: z.number().int(),
  combinedEtaMinutes: z.number().int().nullable(),
});
export type CartView = z.infer<typeof CartViewSchema>;

export const AddToCartRequestSchema = z.object({
  canonicalSku: z.string(),
  sourceId: SourceIdSchema,
  sourceProductId: z.string(),
  qty: z.number().int().positive().default(1),
});
export type AddToCartRequest = z.infer<typeof AddToCartRequestSchema>;
