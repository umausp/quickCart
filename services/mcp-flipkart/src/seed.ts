import type { RetailerCatalogItem } from "@quickcart/retailer-mcp-kit";

const p = (rupees: number): number => Math.round(rupees * 100);

/**
 * Flipkart seed catalogue: marketplace profile — day-level delivery (`etaDays`, not
 * `etaMinutesBase`), unknown live quantity (`stockQty: null`, Doc 04's "in-stock flag, not
 * live qty"), handoff fulfilment. AMUL-BUTTER-500G is deliberately out of stock here — the
 * exact "Flipkart: out of stock in your area" row from the Doc 01 Detail mockup.
 */
export const items: RetailerCatalogItem[] = [
  {
    canonicalSku: "AMUL-BUTTER-500G", sourceProductId: "fk_amul_butter_500g", title: "Amul Butter (Pasteurised, Salted)",
    brand: "Amul", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Creamy pasteurised salted table butter.",
    mrpPaise: p(295), sellingPricePaise: p(275), etaDays: 2, stockQty: 0, deliveryFeePaise: 0, rating: 4.0, fulfilment: "handoff",
  },
  {
    canonicalSku: "MAGGI-MASALA-12P", sourceProductId: "fk_maggi_masala_12p", title: "Maggi 2-Minute Masala Noodles",
    brand: "Maggi", categoryId: "snacks", packSize: "Pack of 12 · 840 g", image: "🍜", description: "India's favourite instant noodles, masala flavour.",
    mrpPaise: p(165), sellingPricePaise: p(152), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.3, fulfilment: "handoff",
  },
  {
    canonicalSku: "COKE-750ML", sourceProductId: "fk_coke_750ml", title: "Coca-Cola Soft Drink",
    brand: "Coca-Cola", categoryId: "beverages", packSize: "750 ml", image: "🥤", description: "Classic Coca-Cola, 750 ml bottle.",
    mrpPaise: p(45), sellingPricePaise: p(44), etaDays: 2, stockQty: null, deliveryFeePaise: p(40), rating: 4.2, fulfilment: "handoff",
  },
  {
    canonicalSku: "BOAT-AIRDOPES-311", sourceProductId: "fk_boat_airdopes_311", title: "boAt Airdopes 311 Pro",
    brand: "boAt", categoryId: "electronics", packSize: "True Wireless Earbuds", image: "🎧", description: "TWS earbuds with ENx tech and 30h playback.",
    mrpPaise: p(4490), sellingPricePaise: p(1399), etaDays: 2, stockQty: null, deliveryFeePaise: p(40), rating: 4.1, fulfilment: "handoff",
  },
  {
    canonicalSku: "MOTHERDAIRY-BUTTER-500G", sourceProductId: "fk_motherdairy_butter_500g", title: "Mother Dairy Butter",
    brand: "Mother Dairy", categoryId: "grocery", packSize: "500 g", image: "🧈", description: "Table butter from Mother Dairy.",
    mrpPaise: p(295), sellingPricePaise: p(280), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.0, fulfilment: "handoff",
  },
  {
    canonicalSku: "TATA-SALT-1KG", sourceProductId: "fk_tata_salt_1kg", title: "Tata Salt",
    brand: "Tata", categoryId: "grocery", packSize: "1 kg", image: "🧂", description: "Iodised crystal salt.",
    mrpPaise: p(28), sellingPricePaise: p(25), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.4, fulfilment: "handoff",
  },
  {
    canonicalSku: "LAYS-CHIPS-52G", sourceProductId: "fk_lays_chips_52g", title: "Lay's India's Magic Masala",
    brand: "Lay's", categoryId: "snacks", packSize: "52 g", image: "🥔", description: "Crispy potato chips, Magic Masala flavour.",
    mrpPaise: p(20), sellingPricePaise: p(19), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.2, fulfilment: "handoff",
  },
  {
    canonicalSku: "PARLE-G-250G", sourceProductId: "fk_parleg_250g", title: "Parle-G Original Gluco Biscuits",
    brand: "Parle", categoryId: "snacks", packSize: "250 g", image: "🍪", description: "The original glucose biscuit.",
    mrpPaise: p(30), sellingPricePaise: p(27), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.3, fulfilment: "handoff",
  },
  {
    canonicalSku: "SURF-EXCEL-1KG", sourceProductId: "fk_surf_excel_1kg", title: "Surf Excel Easy Wash Detergent",
    brand: "Surf Excel", categoryId: "home", packSize: "1 kg", image: "🧺", description: "Detergent powder for tough stains.",
    mrpPaise: p(135), sellingPricePaise: p(115), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.4, fulfilment: "handoff",
  },
  {
    canonicalSku: "COLGATE-STRONG-150G", sourceProductId: "fk_colgate_strong_150g", title: "Colgate Strong Teeth Toothpaste",
    brand: "Colgate", categoryId: "personal-care", packSize: "150 g", image: "🪥", description: "Cavity protection toothpaste.",
    mrpPaise: p(95), sellingPricePaise: p(80), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.4, fulfilment: "handoff",
  },
  {
    canonicalSku: "PAMPERS-M-36", sourceProductId: "fk_pampers_m_36", title: "Pampers Baby-Dry Pants (M)",
    brand: "Pampers", categoryId: "baby", packSize: "36 pcs", image: "🍼", description: "Medium size baby diaper pants, pack of 36.",
    mrpPaise: p(699), sellingPricePaise: p(615), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.5, fulfilment: "handoff",
  },
  {
    canonicalSku: "DETTOL-SOAP-125G", sourceProductId: "fk_dettol_soap_125g", title: "Dettol Original Soap",
    brand: "Dettol", categoryId: "personal-care", packSize: "125 g", image: "🧼", description: "Germ-protection bathing soap.",
    mrpPaise: p(45), sellingPricePaise: p(37), etaDays: 2, stockQty: null, deliveryFeePaise: 0, rating: 4.3, fulfilment: "handoff",
  },
  {
    canonicalSku: "REALME-BUDS-T110", sourceProductId: "fk_realme_buds_t110", title: "realme Buds T110",
    brand: "realme", categoryId: "electronics", packSize: "Wired Earphones", image: "🎧", description: "In-ear wired earphones with mic.",
    mrpPaise: p(1499), sellingPricePaise: p(679), etaDays: 2, stockQty: null, deliveryFeePaise: p(40), rating: 4.1, fulfilment: "handoff",
  },
];
