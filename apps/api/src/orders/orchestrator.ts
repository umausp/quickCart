import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import type { AggregationGateway } from "@quickcart/aggregation-core";
import { SOURCE_META, type AddressSnapshot, type CartLine, type Location, type Order, type OrderStatus, type SourceId, type SubOrder, type SubOrderItem } from "@quickcart/contracts";
import { AGGREGATION_GATEWAY } from "../aggregation/aggregation.tokens.js";

function groupLinesBySource(lines: CartLine[]): Map<SourceId, CartLine[]> {
  const groups = new Map<SourceId, CartLine[]>();
  for (const line of lines) {
    const existing = groups.get(line.sourceId);
    if (existing) existing.push(line);
    else groups.set(line.sourceId, [line]);
  }
  return groups;
}

function toSubOrderItems(lines: CartLine[], state: SubOrderItem["state"]): SubOrderItem[] {
  return lines.map((l) => ({ canonicalSku: l.canonicalSku, sourceProductId: l.sourceProductId, title: l.title, image: l.image, qty: l.qty, unitPricePaise: l.unitPricePaise, state }));
}

/** Doc 04's fulfilment vocabulary ("managed"/"handoff") vs. Doc 06's sub-order vocabulary
 * ("managed"/"assisted") describe the same axis — this is the one place they meet. */
function toSubOrderMode(fulfilment: "managed" | "handoff"): "managed" | "assisted" {
  return fulfilment === "managed" ? "managed" : "assisted";
}

/**
 * Places one company's slice of the basket — `create_cart` → `add_to_cart`(each line) →
 * `checkout`, all real MCP calls against that one source (Doc 06 §"Orchestration as a saga",
 * `placeSubOrder`). Never throws: an MCP/network failure and a business rejection
 * (`checkout` returning `REJECTED` because stock moved) both resolve to a non-CONFIRMED
 * sub-order, so one company's outage never fails the rest of the basket.
 */
async function placeSubOrder(
  sourceId: SourceId,
  lines: CartLine[],
  aggregation: AggregationGateway,
  location: Location,
  address: AddressSnapshot,
  paymentToken: string,
): Promise<SubOrder> {
  const mode = toSubOrderMode(SOURCE_META[sourceId].fulfilment);
  try {
    const { cartId } = await aggregation.createCart(sourceId, location);
    for (const line of lines) {
      await aggregation.addToCart(sourceId, cartId, line.sourceProductId, line.qty);
    }
    const result = await aggregation.checkout(sourceId, cartId, { line1: address.line1, city: address.city, pincode: address.pincode }, paymentToken);
    const confirmed = result.status === "CONFIRMED";
    const deliveryFeePaise = Math.max(0, ...lines.map((l) => l.deliveryFeePaise));
    const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);

    return {
      subOrderId: randomUUID(),
      sourceId,
      mode,
      status: confirmed ? "CONFIRMED" : "OUT_OF_STOCK",
      externalRef: result.orderId,
      trackingUrl: confirmed ? result.trackingUrl : null,
      etaMinutes: confirmed ? result.etaMinutes : null,
      items: toSubOrderItems(lines, confirmed ? "confirmed" : "refunded"),
      subtotalPaise: confirmed ? subtotalPaise : 0,
      deliveryFeePaise: confirmed ? deliveryFeePaise : 0,
    };
  } catch (err) {
    console.warn(`[orders] sub-order failed for ${sourceId}:`, err instanceof Error ? err.message : err);
    return {
      subOrderId: randomUUID(),
      sourceId,
      mode,
      status: "FAILED",
      externalRef: null,
      trackingUrl: null,
      etaMinutes: null,
      items: toSubOrderItems(lines, "refunded"),
      subtotalPaise: 0,
      deliveryFeePaise: 0,
    };
  }
}

export interface PlaceOrderOptions {
  userId: string;
  lines: CartLine[];
  address: AddressSnapshot;
  location: Location;
}

/**
 * One cart → one internal Order → one sub-order per company MCP, placed in parallel
 * (Doc 06 Figure 6.3). No real PSP in this ideation build — `paymentToken` is a stand-in and
 * "authorise/capture" are amounts recorded on the Order, not real money movement (see
 * README "simplifications"). Re-sourcing a failed line to an alternate in-stock source
 * (Doc 06 §"Orchestration as a saga", step 4) is out of scope here — a failed sub-order
 * simply lands the order in `PARTIALLY_CONFIRMED` rather than being silently retried elsewhere.
 */
@Injectable()
export class OrderOrchestrator {
  constructor(@Inject(AGGREGATION_GATEWAY) private readonly aggregation: AggregationGateway) {}

  async placeOrder(opts: PlaceOrderOptions): Promise<Order> {
    const groups = groupLinesBySource(opts.lines);
    const paymentToken = `tok_${randomUUID()}`;

    const subOrders = await Promise.all(
      [...groups.entries()].map(([sourceId, lines]) => placeSubOrder(sourceId, lines, this.aggregation, opts.location, opts.address, paymentToken)),
    );

    const confirmed = subOrders.filter((s) => s.status === "CONFIRMED");
    const totalCapturedPaise = confirmed.reduce((sum, s) => sum + s.subtotalPaise + s.deliveryFeePaise, 0);
    const totalAuthorisedPaise =
      opts.lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0) + Math.max(0, ...opts.lines.map((l) => l.deliveryFeePaise));
    const etas = confirmed.map((s) => s.etaMinutes).filter((e): e is number => e != null);

    const status: OrderStatus = confirmed.length === 0 ? "CANCELLED" : confirmed.length === subOrders.length ? "CONFIRMED" : "PARTIALLY_CONFIRMED";

    const now = new Date().toISOString();
    return {
      orderId: randomUUID(),
      userId: opts.userId,
      status,
      combinedEtaMinutes: etas.length ? Math.max(...etas) : null,
      totalAuthorisedPaise,
      totalCapturedPaise,
      address: opts.address,
      subOrders,
      createdAt: now,
      updatedAt: now,
    };
  }
}
