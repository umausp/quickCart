/**
 * Proves the *write* side of the unified MCP contract is real too: create_cart → add_to_cart
 * → checkout against one live retailer server, over the same JSON-RPC 2.0 transport.
 *
 * Usage: pnpm mcp:checkout-demo [sourceId] [sourceProductId]
 *   e.g. pnpm mcp:checkout-demo blinkit blk_amul_butter_500g
 */
import { connectMcpClient, callTool } from "@quickcart/mcp-toolkit";
import type { AddToCartOutput, CheckoutOutput, CreateCartOutput, SourceId } from "@quickcart/contracts";

const PORTS: Record<SourceId, number> = { blinkit: 7001, zepto: 7002, bigbasket: 7003, flipkart: 7004, amazon: 7005 };

async function main(): Promise<void> {
  const sourceId = (process.argv[2] ?? "blinkit") as SourceId;
  const sourceProductId = process.argv[3] ?? "blk_amul_butter_500g";
  const port = PORTS[sourceId];
  if (!port) throw new Error(`unknown sourceId: ${sourceId}`);

  console.log(`\nReal MCP write flow against ${sourceId} (:${port}) — create_cart → add_to_cart → checkout\n`);

  const handle = await connectMcpClient({ sourceId, url: `http://localhost:${port}/mcp`, clientName: "quickcart-checkout-demo" });
  try {
    const { cartId } = await callTool<CreateCartOutput>(handle, "create_cart", { location: { pincode: "560001" } });
    console.log(`1) create_cart  -> cartId=${cartId}`);

    const added = await callTool<AddToCartOutput>(handle, "add_to_cart", { cartId, sourceProductId, qty: 2 });
    console.log(`2) add_to_cart  -> subtotal=₹${added.subtotalPaise / 100}, lines=${added.lineItems.length}`);

    const order = await callTool<CheckoutOutput>(handle, "checkout", {
      cartId,
      address: { line1: "221B Baker Street", city: "Bengaluru", pincode: "560001" },
      paymentToken: "tok_demo",
    });
    console.log(`3) checkout     -> orderId=${order.orderId} status=${order.status} total=₹${order.totalPaise / 100} eta=${order.etaMinutes}min`);
    console.log(`\nTracking: ${order.trackingUrl}\n`);
  } finally {
    await handle.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
