import type { Offer, SourceProduct } from "@quickcart/contracts";

/** Collapses one source's listing into the canonical `Offer` shape (Doc 05 §3). Landed price
 * = effective price + delivery fee — the number ranking actually compares, not the sticker price. */
export function toOffer(product: SourceProduct): Offer {
  return {
    source: product.sourceId,
    canonicalSku: product.canonicalSku,
    sourceProductId: product.sourceProductId,
    title: product.title,
    brand: product.brand,
    packSize: product.packSize,
    image: product.image,
    mrpPaise: product.mrpPaise,
    pricePaise: product.effectivePricePaise,
    deliveryFeePaise: product.deliveryFeePaise,
    landedPaise: product.effectivePricePaise + product.deliveryFeePaise,
    inStock: product.inStock,
    stockQty: product.stockQty,
    etaMinutes: product.etaMinutes,
    rating: product.rating,
    fulfilment: product.fulfilment,
    fetchedAt: product.fetchedAt,
  };
}
