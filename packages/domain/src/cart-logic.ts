import { SOURCE_META, type Cart, type CartGroup, type CartLine, type CartView } from "@quickcart/contracts";

/**
 * Pure data shaping — no I/O. Groups a flat cart by company into the tabbed view the Cart
 * screen renders directly: one tab per source, each with its own subtotal/ETA, plus a
 * combined total/ETA footer. `combinedEtaMinutes` is the max across groups (Doc 06 §"Combined
 * ETA" — a pooled delivery is only as fast as its slowest leg).
 */
export function buildCartView(cart: Cart): CartView {
  const bySource = new Map<string, CartLine[]>();
  for (const line of cart.lines) {
    const existing = bySource.get(line.sourceId);
    if (existing) existing.push(line);
    else bySource.set(line.sourceId, [line]);
  }

  const groups: CartGroup[] = [...bySource.entries()].map(([sourceId, lines]) => {
    const meta = SOURCE_META[sourceId as keyof typeof SOURCE_META];
    const subtotalPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.qty, 0);
    const deliveryFeePaise = Math.max(...lines.map((l) => l.deliveryFeePaise), 0);
    const etaMinutes = lines.some((l) => l.etaMinutes == null) ? null : Math.max(...lines.map((l) => l.etaMinutes ?? 0));
    return { sourceId: meta.id, label: meta.label, color: meta.color, lines, subtotalPaise, deliveryFeePaise, etaMinutes };
  });

  groups.sort((a, b) => a.label.localeCompare(b.label));

  const combinedSubtotalPaise = groups.reduce((sum, g) => sum + g.subtotalPaise, 0);
  const combinedDeliveryFeePaise = groups.reduce((sum, g) => sum + g.deliveryFeePaise, 0);
  const knownEtas = groups.map((g) => g.etaMinutes).filter((e): e is number => e != null);

  return {
    cartId: cart.cartId,
    groups,
    itemCount: cart.lines.reduce((sum, l) => sum + l.qty, 0),
    combinedSubtotalPaise,
    combinedDeliveryFeePaise,
    combinedTotalPaise: combinedSubtotalPaise + combinedDeliveryFeePaise,
    combinedEtaMinutes: knownEtas.length === groups.length && knownEtas.length > 0 ? Math.max(...knownEtas) : null,
  };
}

export function emptyCart(cartId: string, userId: string): Cart {
  return { cartId, userId, pincode: null, addressId: null, lines: [], updatedAt: new Date().toISOString() };
}
