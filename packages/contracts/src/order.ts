import { z } from "zod";
import { SourceIdSchema } from "./source.js";
import { AddressSnapshotSchema } from "./address.js";

/** Order lifecycle (Doc 06 §"Order lifecycle state machine") — simplified for ideation scope. */
export const OrderStatusSchema = z.enum([
  "CREATED",
  "PAYMENT_AUTHORISED",
  "PAYMENT_FAILED",
  "ORCHESTRATING",
  "CONFIRMED",
  "PARTIALLY_CONFIRMED",
  "CANCELLED",
]);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const SubOrderStatusSchema = z.enum(["PENDING", "PLACED", "CONFIRMED", "OUT_OF_STOCK", "FAILED", "REFUNDED"]);
export type SubOrderStatus = z.infer<typeof SubOrderStatusSchema>;

export const SubOrderItemSchema = z.object({
  canonicalSku: z.string(),
  sourceProductId: z.string(),
  title: z.string(),
  image: z.string(),
  qty: z.number().int(),
  unitPricePaise: z.number().int(),
  state: z.enum(["confirmed", "refunded", "substituted"]),
});
export type SubOrderItem = z.infer<typeof SubOrderItemSchema>;

/** One sub-order per company MCP (Doc 06 §"Order & sub-order data model"). */
export const SubOrderSchema = z.object({
  subOrderId: z.string(),
  sourceId: SourceIdSchema,
  mode: z.enum(["managed", "assisted"]),
  status: SubOrderStatusSchema,
  externalRef: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  etaMinutes: z.number().int().nullable(),
  items: z.array(SubOrderItemSchema),
  subtotalPaise: z.number().int(),
  deliveryFeePaise: z.number().int(),
});
export type SubOrder = z.infer<typeof SubOrderSchema>;

export const OrderSchema = z.object({
  orderId: z.string(),
  userId: z.string(),
  status: OrderStatusSchema,
  combinedEtaMinutes: z.number().int().nullable(),
  totalAuthorisedPaise: z.number().int(),
  totalCapturedPaise: z.number().int(),
  /** Snapshot, not a live reference — editing/deleting the saved Address never touches this. */
  address: AddressSnapshotSchema,
  subOrders: z.array(SubOrderSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;

/** Checkout picks a *saved* address by id; the server resolves + snapshots it onto the Order. */
export const PlaceOrderRequestSchema = z.object({
  addressId: z.string(),
});
export type PlaceOrderRequest = z.infer<typeof PlaceOrderRequestSchema>;

/** Slim summary for the order-history list screen. */
export const OrderSummarySchema = z.object({
  orderId: z.string(),
  status: OrderStatusSchema,
  itemCount: z.number().int(),
  totalPaise: z.number().int(),
  combinedEtaMinutes: z.number().int().nullable(),
  sourceIds: z.array(SourceIdSchema),
  createdAt: z.string(),
});
export type OrderSummary = z.infer<typeof OrderSummarySchema>;
