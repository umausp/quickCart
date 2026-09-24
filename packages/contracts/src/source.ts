import { z } from "zod";

/**
 * The five platforms QuickCart aggregates (Doc 04). Every MCP adaptor identifies itself
 * with one of these ids; every Offer, CartLine and SubOrder is keyed by the same id.
 */
export const SOURCE_IDS = ["blinkit", "zepto", "bigbasket", "flipkart", "amazon"] as const;

export const SourceIdSchema = z.enum(SOURCE_IDS);
export type SourceId = z.infer<typeof SourceIdSchema>;

export const FulfilmentModeSchema = z.enum(["managed", "handoff"]);
export type FulfilmentMode = z.infer<typeof FulfilmentModeSchema>;

export interface SourceMeta {
  id: SourceId;
  label: string;
  color: string;
  fulfilment: FulfilmentMode;
  tagline: string;
}

/** Display metadata for the UI (brand chips, company tabs) — not part of any MCP payload. */
export const SOURCE_META: Record<SourceId, SourceMeta> = {
  blinkit: { id: "blinkit", label: "Blinkit", color: "#0c831f", fulfilment: "managed", tagline: "Minutes, not hours" },
  zepto: { id: "zepto", label: "Zepto", color: "#7b2ff7", fulfilment: "managed", tagline: "10-minute delivery" },
  bigbasket: { id: "bigbasket", label: "BigBasket", color: "#84c225", fulfilment: "managed", tagline: "Deepest grocery catalogue" },
  flipkart: { id: "flipkart", label: "Flipkart", color: "#2874f0", fulfilment: "handoff", tagline: "Wide marketplace" },
  amazon: { id: "amazon", label: "Amazon", color: "#ff9900", fulfilment: "handoff", tagline: "Prime selection" },
};
