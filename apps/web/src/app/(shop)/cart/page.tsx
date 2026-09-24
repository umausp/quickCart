import { redirect } from "next/navigation";
import type { CartView as CartViewData } from "@quickcart/contracts";
import { apiRead } from "../../../lib/api";
import { CartView } from "./cart-view";

export default async function CartPage() {
  const { data: cart, session } = await apiRead<CartViewData>("/cart");
  if (!session || !cart) redirect("/login");
  return <CartView cart={cart} />;
}
