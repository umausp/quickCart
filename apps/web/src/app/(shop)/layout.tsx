import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { CartView } from "@quickcart/contracts";
import { apiRead } from "../../lib/api";
import { AppShell } from "./app-shell";

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const { data: cart, session } = await apiRead<CartView>("/cart");
  if (!session) redirect("/login");

  return <AppShell cartItemCount={cart?.itemCount ?? 0}>{children}</AppShell>;
}
