"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Order } from "@quickcart/contracts";
import { apiAction, ApiError } from "../../lib/api";
import type { PlaceOrderState } from "./form-state";

/** `idempotencyKey` is generated once when the Checkout page renders and carried as a
 * hidden field — a resubmit of the same form (double-tap, retried network) reuses it, so
 * the backend returns the same order instead of placing a second one (Doc 03/06). */
export async function placeOrderAction(_prev: PlaceOrderState, formData: FormData): Promise<PlaceOrderState> {
  const addressId = String(formData.get("addressId") ?? "");
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  if (!addressId) return { error: "Choose a delivery address first." };

  let order: Order;
  try {
    order = await apiAction<Order>("/orders", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify({ addressId }),
    });
  } catch (err) {
    if (err instanceof ApiError && err.status === 400) return { error: "Your cart is empty." };
    return { error: "Could not place the order. Please try again." };
  }

  revalidatePath("/cart");
  revalidatePath("/", "layout");
  redirect(`/orders/${order.orderId}`);
}
