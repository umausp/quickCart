import type { RetailerCatalogItem } from "@quickcart/retailer-mcp-kit";

const p = (rupees: number): number => Math.round(rupees * 100);

/**
 * Blinkit seed catalogue. Fast, cheap, zero-delivery-fee-heavy — quick-commerce's classic
 * profile (Doc 04). Deliberately missing REALME-BUDS-T110 (electronics is thin here) and
 * PAMPERS-M-36 is listed but out of stock, so the fan-out has real partial-result cases.
 */
export const items: RetailerCatalogItem[] = [
  {
    canonicalSku: "AMUL-BUTTER-500G", sourceProductId: "blk_amul_butter_500g", title: "Amul Butter (Pasteurised, Salted)",
    brand: "Amul", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Creamy pasteurised salted table butter.",
    mrpPaise: p(295), sellingPricePaise: p(268), etaMinutesBase: 11, stockQty: 14, deliveryFeePaise: 0, rating: 4.3, fulfilment: "managed",
  },
  {
    canonicalSku: "MAGGI-MASALA-12P", sourceProductId: "blk_maggi_masala_12p", title: "Maggi 2-Minute Masala Noodles",
    brand: "Maggi", categoryId: "snacks", packSize: "Pack of 12 · 840 g", image: "🍜", description: "India's favourite instant noodles, masala flavour.",
    mrpPaise: p(168), sellingPricePaise: p(152), autoDiscountPaise: p(8), etaMinutesBase: 12, stockQty: 30, deliveryFeePaise: 0, rating: 4.6, fulfilment: "managed",
  },
  {
    canonicalSku: "COKE-750ML", sourceProductId: "blk_coke_750ml", title: "Coca-Cola Soft Drink",
    brand: "Coca-Cola", categoryId: "beverages", packSize: "750 ml", image: "🥤", description: "Classic Coca-Cola, 750 ml bottle.",
    mrpPaise: p(45), sellingPricePaise: p(42), etaMinutesBase: 10, stockQty: 60, deliveryFeePaise: 0, rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "NANDINI-BUTTER-500G", sourceProductId: "blk_nandini_butter_500g", title: "Nandini Butter",
    brand: "Nandini", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Karnataka Milk Federation's classic butter.",
    mrpPaise: p(282), sellingPricePaise: p(262), etaMinutesBase: 12, stockQty: 15, deliveryFeePaise: 0, rating: 4.1, fulfilment: "managed",
  },
  {
    canonicalSku: "MOTHERDAIRY-BUTTER-500G", sourceProductId: "blk_motherdairy_butter_500g", title: "Mother Dairy Butter",
    brand: "Mother Dairy", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Table butter from Mother Dairy.",
    mrpPaise: p(290), sellingPricePaise: p(275), etaMinutesBase: 13, stockQty: 14, deliveryFeePaise: 0, rating: 4.2, fulfilment: "managed",
  },
  {
    canonicalSku: "TATA-SALT-1KG", sourceProductId: "blk_tata_salt_1kg", title: "Tata Salt",
    brand: "Tata", categoryId: "grocery", packSize: "1 kg", image: "🧂", description: "Iodised crystal salt.",
    mrpPaise: p(28), sellingPricePaise: p(25), etaMinutesBase: 10, stockQty: 80, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "LAYS-CHIPS-52G", sourceProductId: "blk_lays_chips_52g", title: "Lay's India's Magic Masala",
    brand: "Lay's", categoryId: "snacks", packSize: "52 g", image: "🥔", description: "Crispy potato chips, Magic Masala flavour.",
    mrpPaise: p(20), sellingPricePaise: p(18), etaMinutesBase: 9, stockQty: 120, deliveryFeePaise: 0, rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "PARLE-G-250G", sourceProductId: "blk_parleg_250g", title: "Parle-G Original Gluco Biscuits",
    brand: "Parle", categoryId: "snacks", packSize: "250 g", image: "🍪", description: "The original glucose biscuit.",
    mrpPaise: p(30), sellingPricePaise: p(27), etaMinutesBase: 10, stockQty: 100, deliveryFeePaise: 0, rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "SURF-EXCEL-1KG", sourceProductId: "blk_surf_excel_1kg", title: "Surf Excel Easy Wash Detergent",
    brand: "Surf Excel", categoryId: "home", packSize: "1 kg", image: "🧺", description: "Detergent powder for tough stains.",
    mrpPaise: p(135), sellingPricePaise: p(118), etaMinutesBase: 13, stockQty: 40, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "COLGATE-STRONG-150G", sourceProductId: "blk_colgate_strong_150g", title: "Colgate Strong Teeth Toothpaste",
    brand: "Colgate", categoryId: "personal-care", packSize: "150 g", image: "🪥", description: "Cavity protection toothpaste.",
    mrpPaise: p(95), sellingPricePaise: p(82), etaMinutesBase: 9, stockQty: 70, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "PAMPERS-M-36", sourceProductId: "blk_pampers_m_36", title: "Pampers Baby-Dry Pants (M)",
    brand: "Pampers", categoryId: "baby", packSize: "36 pcs", image: "🍼", description: "Medium size baby diaper pants, pack of 36.",
    mrpPaise: p(699), sellingPricePaise: p(620), etaMinutesBase: 14, stockQty: 0, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "DETTOL-SOAP-125G", sourceProductId: "blk_dettol_soap_125g", title: "Dettol Original Soap",
    brand: "Dettol", categoryId: "personal-care", packSize: "125 g", image: "🧼", description: "Germ-protection bathing soap.",
    mrpPaise: p(45), sellingPricePaise: p(38), etaMinutesBase: 9, stockQty: 90, deliveryFeePaise: 0, rating: 4.4, fulfilment: "managed",
  },
];
