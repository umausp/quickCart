import { DEFAULT_CATEGORIES, runRetailerService } from "@quickcart/retailer-mcp-kit";
import { items } from "./seed.js";

const PORT = Number(process.env.PORT ?? 7002);

runRetailerService({ sourceId: "zepto", port: PORT, items, categories: DEFAULT_CATEGORIES });
