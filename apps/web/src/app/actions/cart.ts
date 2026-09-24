"use server";

import { revalidatePath } from "next/cache";
import { AddToCartRequestSchema, type CartView } from "@quickcart/contracts";
import { ApiError, apiAction } from "../../lib/api";

/** Every mutation revalidates `/cart` (the page itself) and the root layout (the bottom-nav
 * cart badge lives in `(shop)/layout.tsx`, one level above every page that can add an item). */
function revalidateCart(): void {
  revalidatePath("/cart");
  revalidatePath("/", "layout");
}

export interface AddToCartState {
  error: string | null;
}

const ADD_TO_CART_ERROR_MESSAGES: Record<string, string> = {
  unknown_product: "That item is no longer available.",
  out_of_stock: "That item just went out of stock.",
};

/** Bound via `useActionState` (not a plain `(formData) => Promise<void>`) specifically so a
 * real failure — an item that's gone out of stock, a stale/expired real-Zepto product id —
 * surfaces as an inline message instead of an uncaught Server Action error, which Next
 * renders as its generic crash screen requiring a reload. The *entire* body is inside the
 * try/catch, deliberately — an earlier version only wrapped the API call, and a validation
 * error thrown by `.parse()` (outside that block) still crashed the same way this was meant
 * to prevent. */
export async function addToCartAction(_prev: AddToCartState, formData: FormData): Promise<AddToCartState> {
  try {
    const result = AddToCartRequestSchema.safeParse({
      canonicalSku: formData.get("canonicalSku"),
      sourceId: formData.get("sourceId"),
      sourceProductId: formData.get("sourceProductId"),
      qty: Number(formData.get("qty") ?? 1),
    });
    if (!result.success) return { error: "Couldn't add that item. Try again." };

    await apiAction<CartView>("/cart/items", { method: "POST", body: JSON.stringify(result.data) });
    revalidateCart();
    return { error: null };
  } catch (err) {
    if (err instanceof ApiError) {
      const code = (err.body as { error?: string } | null)?.error;
      return { error: (code && ADD_TO_CART_ERROR_MESSAGES[code]) ?? "Couldn't add that item. Try again." };
    }
    return { error: "Couldn't add that item. Try again." };
  }
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
