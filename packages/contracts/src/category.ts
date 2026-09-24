import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  parentId: z.string().nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

/** Static taxonomy (Doc 01's Home category grid) — every retailer seed shares this list;
 * unlike price/stock/ETA it's not something worth a live MCP round-trip for. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "grocery", name: "Grocery", icon: "🛒", parentId: null },
  { id: "snacks", name: "Snacks", icon: "🍫", parentId: null },
  { id: "beverages", name: "Beverages", icon: "🥤", parentId: null },
  { id: "personal-care", name: "Personal Care", icon: "🧴", parentId: null },
  { id: "electronics", name: "Electronics", icon: "🎧", parentId: null },
  { id: "home", name: "Home", icon: "🏠", parentId: null },
  { id: "baby", name: "Baby", icon: "🍼", parentId: null },
  { id: "pharmacy", name: "Pharmacy", icon: "💊", parentId: null },
];
