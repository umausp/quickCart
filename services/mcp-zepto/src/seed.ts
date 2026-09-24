import type { RetailerCatalogItem } from "@quickcart/retailer-mcp-kit";

const p = (rupees: number): number => Math.round(rupees * 100);

/**
 * Zepto seed catalogue: the fastest ETAs of the five, a small flat delivery fee, and — unlike
 * the other quick-commerce players here — a foothold in electronics (Airdopes, realme Buds),
 * matching Doc 04's note that quick-commerce is expanding beyond grocery.
 */
export const items: RetailerCatalogItem[] = [
  {
    canonicalSku: "AMUL-BUTTER-500G", sourceProductId: "zpt_amul_butter_500g", title: "Amul Butter (Pasteurised, Salted)",
    brand: "Amul", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Creamy pasteurised salted table butter.",
    mrpPaise: p(290), sellingPricePaise: p(278), autoDiscountPaise: p(13), couponCode: "WELCOME50", couponMinCartPaise: p(199),
    etaMinutesBase: 9, stockQty: 20, deliveryFeePaise: p(15), rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "MAGGI-MASALA-12P", sourceProductId: "zpt_maggi_masala_12p", title: "Maggi 2-Minute Masala Noodles",
    brand: "Maggi", categoryId: "snacks", packSize: "Pack of 12 · 840 g", image: "🍜", description: "India's favourite instant noodles, masala flavour.",
    mrpPaise: p(168), sellingPricePaise: p(156), autoDiscountPaise: p(8), etaMinutesBase: 8, stockQty: 25, deliveryFeePaise: p(15), rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "COKE-750ML", sourceProductId: "zpt_coke_750ml", title: "Coca-Cola Soft Drink",
    brand: "Coca-Cola", categoryId: "beverages", packSize: "750 ml", image: "🥤", description: "Classic Coca-Cola, 750 ml bottle.",
    mrpPaise: p(45), sellingPricePaise: p(40), etaMinutesBase: 9, stockQty: 50, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "BOAT-AIRDOPES-311", sourceProductId: "zpt_boat_airdopes_311", title: "boAt Airdopes 311 Pro",
    brand: "boAt", categoryId: "electronics", packSize: "True Wireless Earbuds", image: "🎧", description: "TWS earbuds with ENx tech and 30h playback.",
    mrpPaise: p(4490), sellingPricePaise: p(1599), etaMinutesBase: 45, stockQty: 6, deliveryFeePaise: p(49), rating: 4.0, fulfilment: "managed",
  },
  {
    canonicalSku: "NANDINI-BUTTER-500G", sourceProductId: "zpt_nandini_butter_500g", title: "Nandini Butter",
    brand: "Nandini", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Karnataka Milk Federation's classic butter.",
    mrpPaise: p(280), sellingPricePaise: p(258), etaMinutesBase: 10, stockQty: 22, deliveryFeePaise: p(15), rating: 4.3, fulfilment: "managed",
  },
  {
    canonicalSku: "MOTHERDAIRY-BUTTER-500G", sourceProductId: "zpt_motherdairy_butter_500g", title: "Mother Dairy Butter",
    brand: "Mother Dairy", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Table butter from Mother Dairy.",
    mrpPaise: p(290), sellingPricePaise: p(272), etaMinutesBase: 10, stockQty: 16, deliveryFeePaise: 0, rating: 4.3, fulfilment: "managed",
  },
  {
    canonicalSku: "TATA-SALT-1KG", sourceProductId: "zpt_tata_salt_1kg", title: "Tata Salt",
    brand: "Tata", categoryId: "grocery", packSize: "1 kg", image: "🧂", description: "Iodised crystal salt.",
    mrpPaise: p(28), sellingPricePaise: p(26), etaMinutesBase: 8, stockQty: 70, deliveryFeePaise: p(15), rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "LAYS-CHIPS-52G", sourceProductId: "zpt_lays_chips_52g", title: "Lay's India's Magic Masala",
    brand: "Lay's", categoryId: "snacks", packSize: "52 g", image: "🥔", description: "Crispy potato chips, Magic Masala flavour.",
    mrpPaise: p(20), sellingPricePaise: p(19), etaMinutesBase: 7, stockQty: 110, deliveryFeePaise: 0, rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "PARLE-G-250G", sourceProductId: "zpt_parleg_250g", title: "Parle-G Original Gluco Biscuits",
    brand: "Parle", categoryId: "snacks", packSize: "250 g", image: "🍪", description: "The original glucose biscuit.",
    mrpPaise: p(30), sellingPricePaise: p(28), etaMinutesBase: 8, stockQty: 90, deliveryFeePaise: p(15), rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "SURF-EXCEL-1KG", sourceProductId: "zpt_surf_excel_1kg", title: "Surf Excel Easy Wash Detergent",
    brand: "Surf Excel", categoryId: "home", packSize: "1 kg", image: "🧺", description: "Detergent powder for tough stains.",
    mrpPaise: p(135), sellingPricePaise: p(121), etaMinutesBase: 11, stockQty: 35, deliveryFeePaise: p(15), rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "COLGATE-STRONG-150G", sourceProductId: "zpt_colgate_strong_150g", title: "Colgate Strong Teeth Toothpaste",
    brand: "Colgate", categoryId: "personal-care", packSize: "150 g", image: "🪥", description: "Cavity protection toothpaste.",
    mrpPaise: p(95), sellingPricePaise: p(84), etaMinutesBase: 7, stockQty: 65, deliveryFeePaise: p(15), rating: 4.5, fulfilment: "managed",
  },
  {
    canonicalSku: "PAMPERS-M-36", sourceProductId: "zpt_pampers_m_36", title: "Pampers Baby-Dry Pants (M)",
    brand: "Pampers", categoryId: "baby", packSize: "36 pcs", image: "🍼", description: "Medium size baby diaper pants, pack of 36.",
    mrpPaise: p(699), sellingPricePaise: p(635), etaMinutesBase: 12, stockQty: 25, deliveryFeePaise: p(15), rating: 4.6, fulfilment: "managed",
  },
  {
    canonicalSku: "DETTOL-SOAP-125G", sourceProductId: "zpt_dettol_soap_125g", title: "Dettol Original Soap",
    brand: "Dettol", categoryId: "personal-care", packSize: "125 g", image: "🧼", description: "Germ-protection bathing soap.",
    mrpPaise: p(45), sellingPricePaise: p(39), etaMinutesBase: 7, stockQty: 85, deliveryFeePaise: p(15), rating: 4.4, fulfilment: "managed",
  },
  {
    canonicalSku: "REALME-BUDS-T110", sourceProductId: "zpt_realme_buds_t110", title: "realme Buds T110",
    brand: "realme", categoryId: "electronics", packSize: "Wired Earphones", image: "🎧", description: "In-ear wired earphones with mic.",
    mrpPaise: p(1499), sellingPricePaise: p(799), etaMinutesBase: 50, stockQty: 8, deliveryFeePaise: p(49), rating: 3.9, fulfilment: "managed",
  },
];
