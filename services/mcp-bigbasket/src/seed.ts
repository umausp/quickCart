import type { RetailerCatalogItem } from "@quickcart/retailer-mcp-kit";

const p = (rupees: number): number => Math.round(rupees * 100);

/**
 * BigBasket seed catalogue: deepest grocery/household range, consistently the cheapest
 * sticker price, but the slowest quick-commerce ETA of the three (Doc 04's "slot vs express"
 * nuance) — free delivery almost everywhere offsets that in the ranking. No electronics
 * (BOAT-AIRDOPES-311, REALME-BUDS-T110 both omitted) — grocery is where BigBasket wins.
 */
export const items: RetailerCatalogItem[] = [
  {
    canonicalSku: "AMUL-BUTTER-500G", sourceProductId: "bb_amul_butter_500g", title: "Amul Butter (Pasteurised, Salted)",
    brand: "Amul", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Creamy pasteurised salted table butter.",
    mrpPaise: p(290), sellingPricePaise: p(262), etaMinutesBase: 95, stockQty: 18, deliveryFeePaise: 0, rating: 4.1, fulfilment: "managed",
  },
  {
    canonicalSku: "MAGGI-MASALA-12P", sourceProductId: "bb_maggi_masala_12p", title: "Maggi 2-Minute Masala Noodles",
    brand: "Maggi", categoryId: "snacks", packSize: "Pack of 12 · 840 g", image: "🍜", description: "India's favourite instant noodles, masala flavour.",
    mrpPaise: p(168), sellingPricePaise: p(150), etaMinutesBase: 70, stockQty: 40, deliveryFeePaise: 0, rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "COKE-750ML", sourceProductId: "bb_coke_750ml", title: "Coca-Cola Soft Drink",
    brand: "Coca-Cola", categoryId: "beverages", packSize: "750 ml", image: "🥤", description: "Classic Coca-Cola, 750 ml bottle.",
    mrpPaise: p(45), sellingPricePaise: p(41), etaMinutesBase: 80, stockQty: 55, deliveryFeePaise: 0, rating: 4.3, fulfilment: "managed",
  },
  {
    canonicalSku: "NANDINI-BUTTER-500G", sourceProductId: "bb_nandini_butter_500g", title: "Nandini Butter",
    brand: "Nandini", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Karnataka Milk Federation's classic butter.",
    mrpPaise: p(280), sellingPricePaise: p(255), etaMinutesBase: 14, stockQty: 20, deliveryFeePaise: 0, rating: 4.2, fulfilment: "managed",
  },
  {
    canonicalSku: "MOTHERDAIRY-BUTTER-500G", sourceProductId: "bb_motherdairy_butter_500g", title: "Mother Dairy Butter",
    brand: "Mother Dairy", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Table butter from Mother Dairy.",
    mrpPaise: p(288), sellingPricePaise: p(270), etaMinutesBase: 85, stockQty: 19, deliveryFeePaise: 0, rating: 4.1, fulfilment: "managed",
  },
  {
    canonicalSku: "TATA-SALT-1KG", sourceProductId: "bb_tata_salt_1kg", title: "Tata Salt",
    brand: "Tata", categoryId: "grocery", packSize: "1 kg", image: "🧂", description: "Iodised crystal salt.",
    mrpPaise: p(28), sellingPricePaise: p(24), etaMinutesBase: 75, stockQty: 100, deliveryFeePaise: 0, rating: 4.6, fulfilment: "managed",
  },
  {
    canonicalSku: "LAYS-CHIPS-52G", sourceProductId: "bb_lays_chips_52g", title: "Lay's India's Magic Masala",
    brand: "Lay's", categoryId: "snacks", packSize: "52 g", image: "🥔", description: "Crispy potato chips, Magic Masala flavour.",
    mrpPaise: p(20), sellingPricePaise: p(17), etaMinutesBase: 60, stockQty: 200, deliveryFeePaise: 0, rating: 4.3, fulfilment: "managed",
  },
  {
    canonicalSku: "PARLE-G-250G", sourceProductId: "bb_parleg_250g", title: "Parle-G Original Gluco Biscuits",
    brand: "Parle", categoryId: "snacks", packSize: "250 g", image: "🍪", description: "The original glucose biscuit.",
    mrpPaise: p(30), sellingPricePaise: p(25), etaMinutesBase: 65, stockQty: 150, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "SURF-EXCEL-1KG", sourceProductId: "bb_surf_excel_1kg", title: "Surf Excel Easy Wash Detergent",
    brand: "Surf Excel", categoryId: "home", packSize: "1 kg", image: "🧺", description: "Detergent powder for tough stains.",
    mrpPaise: p(135), sellingPricePaise: p(112), etaMinutesBase: 80, stockQty: 60, deliveryFeePaise: 0, rating: 4.6, fulfilment: "managed",
  },
  {
    canonicalSku: "COLGATE-STRONG-150G", sourceProductId: "bb_colgate_strong_150g", title: "Colgate Strong Teeth Toothpaste",
    brand: "Colgate", categoryId: "personal-care", packSize: "150 g", image: "🪥", description: "Cavity protection toothpaste.",
    mrpPaise: p(95), sellingPricePaise: p(78), etaMinutesBase: 70, stockQty: 90, deliveryFeePaise: 0, rating: 4.6, fulfilment: "managed",
  },
  {
    canonicalSku: "PAMPERS-M-36", sourceProductId: "bb_pampers_m_36", title: "Pampers Baby-Dry Pants (M)",
    brand: "Pampers", categoryId: "baby", packSize: "36 pcs", image: "🍼", description: "Medium size baby diaper pants, pack of 36.",
    mrpPaise: p(699), sellingPricePaise: p(610), etaMinutesBase: 90, stockQty: 40, deliveryFeePaise: 0, rating: 4.6, fulfilment: "managed",
  },
  {
    canonicalSku: "DETTOL-SOAP-125G", sourceProductId: "bb_dettol_soap_125g", title: "Dettol Original Soap",
    brand: "Dettol", categoryId: "personal-care", packSize: "125 g", image: "🧼", description: "Germ-protection bathing soap.",
    mrpPaise: p(45), sellingPricePaise: p(35), etaMinutesBase: 65, stockQty: 120, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
];
