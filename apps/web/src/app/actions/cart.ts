"use server";

import { revalidatePath } from "next/cache";
import { AddToCartRequestSchema, type CartView } from "@quickcart/contracts";
import { apiAction } from "../../lib/api";

/** Every mutation revalidates `/cart` (the page itself) and the root layout (the bottom-nav
 * cart badge lives in `(shop)/layout.tsx`, one level above every page that can add an item). */
function revalidateCart(): void {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export async function addToCartAction(formData: FormData): Promise<void> {
  const parsed = AddToCartRequestSchema.parse({
    canonicalSku: formData.get("canonicalSku"),
    sourceId: formData.get("sourceId"),
    sourceProductId: formData.get("sourceProductId"),
    qty: Number(formData.get("qty") ?? 1),
  });
  await apiAction<CartView>("/cart/items", { method: "POST", body: JSON.stringify(parsed) });
  revalidateCart();
}

export async function updateCartQtyAction(formData: FormData): Promise<void> {
  const lineId = String(formData.get("lineId"));
  const qty = Number(formData.get("qty"));
  await apiAction<CartView>(`/cart/items/${lineId}`, { method: "PATCH", body: JSON.stringify({ qty }) });
  revalidateCart();
}

export async function removeCartItemAction(formData: FormData): Promise<void> {
  const lineId = String(formData.get("lineId"));
  await apiAction<CartView>(`/cart/items/${lineId}`, { method: "DELETE" });
  revalidateCart();
}

export async function clearCartAction(): Promise<void> {
  await apiAction<CartView>("/cart", { method: "DELETE" });
  revalidateCart();
}

export async function setCartAddressAction(formData: FormData): Promise<void> {
  const addressId = String(formData.get("addressId"));
  await apiAction<CartView>("/cart/address", { method: "PATCH", body: JSON.stringify({ addressId }) });
  revalidatePath("/checkout");
}
