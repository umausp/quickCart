import { DEFAULT_CATEGORIES, runRetailerService } from "@quickcart/retailer-mcp-kit";
import { items } from "./seed.js";

const PORT = Number(process.env.PORT ?? 7003);

runRetailerService({ sourceId: "bigbasket", port: PORT, items, categories: DEFAULT_CATEGORIES });
