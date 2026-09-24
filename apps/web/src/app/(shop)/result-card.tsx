"use client";

import { useRouter } from "next/navigation";
import { ProductCard } from "@quickcart/ui";
import type { SearchResultCard } from "@quickcart/contracts";
import { AddToCartButton } from "./add-to-cart-button";

/** The Home/List card, shared by both screens: tap the card to open Detail, tap "Add +" to
 * add the ranked-best offer straight from the list without leaving it. */
export function ResultCard({ card }: { card: SearchResultCard }) {
  const router = useRouter();
  return (
    <ProductCard
      card={card}
      onClick={() => router.push(`/products/${card.canonicalSku}`)}
      actionSlot={<AddToCartButton canonicalSku={card.canonicalSku} sourceId={card.best.source} sourceProductId={card.best.sourceProductId} />}
    />
  );
}
