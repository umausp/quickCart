import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import type { Address, CartView as CartViewData } from "@quickcart/contracts";
import { apiRead } from "../../../lib/api";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const [{ data: cart, session }, { data: addresses }] = await Promise.all([apiRead<CartViewData>("/cart"), apiRead<Address[]>("/addresses")]);
  if (!session) redirect("/login");
  if (!cart || cart.groups.length === 0) redirect("/cart");

  // Generated once per page render, carried as a hidden field — a resubmit of the same
  // rendered form reuses it (Doc 03/06 idempotent placement); a fresh page load gets a new one.
  const idempotencyKey = randomUUID();
  const list = addresses ?? [];
  const defaultAddressId = list.find((a) => a.isDefault)?.id ?? list[0]?.id ?? "";

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <CheckoutForm cart={cart} addresses={list} defaultAddressId={defaultAddressId} idempotencyKey={idempotencyKey} />
    </Box>
  );
}
