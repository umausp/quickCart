import { z } from "zod";

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string(),
  parentId: z.string().nullable(),
});
export type Category = z.infer<typeof CategorySchema>;

/**
 * Static taxonomy (Doc 01's Home category grid). `id` doubles as the free-text query sent to
 * `/v1/search` (see `CategoryLink`) — kept as a single concrete term per category rather than
 * a combined phrase, since Zepto's own real `search_products` tool is documented as a
 * one-concrete-product search, not a category browse (there's no category-listing tool in
 * its real tool set at all — unlike the mock adaptors' `list_products_by_category`). A real
 * grocery spread, matching the one live source behind it today.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: "vegetables", name: "Vegetables", icon: "🥦", parentId: null },
  { id: "fruits", name: "Fruits", icon: "🍎", parentId: null },
  { id: "atta", name: "Atta", icon: "🌾", parentId: null },
  { id: "rice", name: "Rice", icon: "🍚", parentId: null },
  { id: "oil", name: "Oil", icon: "🫒", parentId: null },
  { id: "masala", name: "Masala", icon: "🌶️", parentId: null },
  { id: "dairy", name: "Dairy", icon: "🥛", parentId: null },
  { id: "bakery", name: "Bakery", icon: "🍞", parentId: null },
  { id: "dry fruits", name: "Dry Fruits", icon: "🥜", parentId: null },
  { id: "chips", name: "Chips", icon: "🍟", parentId: null },
  { id: "biscuits", name: "Biscuits", icon: "🍪", parentId: null },
  { id: "beverages", name: "Beverages", icon: "🥤", parentId: null },
  { id: "tea coffee", name: "Tea & Coffee", icon: "☕", parentId: null },
  { id: "frozen food", name: "Frozen Food", icon: "🧊", parentId: null },
  { id: "personal care", name: "Personal Care", icon: "🧴", parentId: null },
  { id: "cleaning", name: "Home Care", icon: "🧹", parentId: null },
  { id: "baby care", name: "Baby Care", icon: "🍼", parentId: null },
  { id: "pharmacy", name: "Pharmacy", icon: "💊", parentId: null },
];
