export { DEFAULT_CATEGORIES } from "@quickcart/contracts";

/**
 * One row of a retailer's seed catalogue. Every one of the five services provides its own
 * array of these — same canonical products, different prices/stock/ETA/fulfilment per
 * company, so the ranking algorithm in `pricing-core` has something real to rank.
 */
export interface RetailerCatalogItem {
  canonicalSku: string;
  sourceProductId: string;
  title: string;
  brand: string;
  categoryId: string;
  packSize: string;
  image: string;
  description: string;
  mrpPaise: number;
  sellingPricePaise: number;
  /** An auto-applied discount on top of sellingPrice — simulates a live platform offer. */
  autoDiscountPaise?: number;
  /** Minute-level ETA for quick-commerce; omit for marketplaces (use etaDays instead). */
  etaMinutesBase?: number;
  /** Day-level delivery promise for marketplaces (Doc 04: "delivery days, not minutes"). */
  etaDays?: number;
  /** null = purchasable but quantity unknown (marketplace availability message only). */
  stockQty: number | null;
  deliveryFeePaise: number;
  rating: number | null;
  fulfilment: "managed" | "handoff";
  couponCode?: string;
  couponMinCartPaise?: number;
}
