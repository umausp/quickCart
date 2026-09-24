"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UpsertAddressSchema, type Address } from "@quickcart/contracts";
import { apiAction } from "../../lib/api";
import type { AddressFormState } from "./form-state";

function toInput(formData: FormData): unknown {
  return {
    label: formData.get("label"),
    contactName: formData.get("contactName"),
    contactPhone: formData.get("contactPhone"),
    line1: formData.get("line1"),
    line2: formData.get("line2") || undefined,
    city: formData.get("city"),
    state: formData.get("state"),
    pincode: formData.get("pincode"),
    isDefault: formData.get("isDefault") === "on",
  };
}

export async function createAddressAction(_prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const parsed = UpsertAddressSchema.safeParse(toInput(formData));
  if (!parsed.success) return { error: "Please fill in all required fields." };
  try {
    await apiAction<Address>("/addresses", { method: "POST", body: JSON.stringify(parsed.data) });
  } catch {
    return { error: "Could not save the address. Try again." };
  }
  revalidatePath("/addresses");
  revalidatePath("/checkout");
  redirect("/addresses");
}

/** Bound with the address id (`updateAddressAction.bind(null, addressId)`) before being
 * handed to `useActionState`, which expects a `(prevState, formData)` signature. */
export async function updateAddressAction(addressId: string, _prev: AddressFormState, formData: FormData): Promise<AddressFormState> {
  const parsed = UpsertAddressSchema.safeParse(toInput(formData));
  if (!parsed.success) return { error: "Please fill in all required fields." };
  try {
    await apiAction<Address>(`/addresses/${addressId}`, { method: "PATCH", body: JSON.stringify(parsed.data) });
  } catch {
    return { error: "Could not update the address. Try again." };
  }
  revalidatePath("/addresses");
  revalidatePath("/checkout");
  redirect("/addresses");
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await apiAction(`/addresses/${id}`, { method: "DELETE" });
  revalidatePath("/addresses");
  revalidatePath("/checkout");
}

export async function setDefaultAddressAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id"));
  await apiAction(`/addresses/${id}/default`, { method: "POST" });
  revalidatePath("/addresses");
  revalidatePath("/checkout");
}
