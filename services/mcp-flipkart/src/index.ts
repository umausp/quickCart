import { DEFAULT_CATEGORIES, runRetailerService } from "@quickcart/retailer-mcp-kit";
import { items } from "./seed.js";

const PORT = Number(process.env.PORT ?? 7004);

runRetailerService({ sourceId: "flipkart", port: PORT, items, categories: DEFAULT_CATEGORIES });
