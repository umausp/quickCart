import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Order } from "@quickcart/contracts";
import { ProductThumb, SourceChip, formatEta, formatRupees } from "@quickcart/ui";
import { ApiError, apiRead } from "../../../../lib/api";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  CONFIRMED: "success",
  PARTIALLY_CONFIRMED: "warning",
  CANCELLED: "error",
  OUT_OF_STOCK: "error",
  FAILED: "error",
  REFUNDED: "default",
  PLACED: "default",
  PENDING: "default",
};

/** Per-company sub-orders, line states, savings, status timeline, delivery address — the
 * full breakdown behind one Order (Doc 06). */
export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let order: Order | null;
  let hasSession: boolean;
  try {
    const result = await apiRead<Order>(`/orders/${id}`);
    order = result.data;
    hasSession = Boolean(result.session);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  if (!hasSession) redirect("/login");
  if (!order) notFound();

  const heldButReleased = order.totalAuthorisedPaise - order.totalCapturedPaise;

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Order #{order.orderId.slice(0, 8)}
          </Typography>
          <Chip size="small" label={order.status.replace(/_/g, " ")} color={STATUS_COLOR[order.status] ?? "default"} />
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Combined ETA {formatEta(order.combinedEtaMinutes)} · Placed {new Date(order.createdAt).toLocaleString()}
        </Typography>

        <Divider />
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Delivering to
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {order.address.contactName} · {order.address.contactPhone}
          <br />
          {order.address.line1}
          {order.address.line2 ? `, ${order.address.line2}` : ""}, {order.address.city}, {order.address.state} {order.address.pincode}
        </Typography>

        <Divider />
        {order.subOrders.map((sub) => (
          <Box key={sub.subOrderId} sx={{ p: 2, border: "1px solid #ececec", borderRadius: 2 }}>
            <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <SourceChip sourceId={sub.sourceId} />
              <Chip size="small" label={sub.status.replace(/_/g, " ")} color={STATUS_COLOR[sub.status] ?? "default"} />
            </Stack>
            <Stack spacing={0.5}>
              {sub.items.map((item) => (
                <Stack key={item.sourceProductId} direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                    <ProductThumb image={item.image} alt={item.title} size={24} />
                    <Typography variant="body2">
                      {item.title} × {item.qty}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color={item.state === "confirmed" ? "text.primary" : "text.secondary"}>
                    {item.state === "confirmed" ? formatRupees(item.unitPricePaise * item.qty) : item.state}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            {sub.status === "CONFIRMED" && (
              <Typography variant="caption" color="text.secondary">
                ETA {formatEta(sub.etaMinutes)} · Ref {sub.externalRef}
              </Typography>
            )}
          </Box>
        ))}

        <Divider />
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Typography variant="body1" sx={{ fontWeight: 800 }}>
            Total charged
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 800 }}>
            {formatRupees(order.totalCapturedPaise)}
          </Typography>
        </Stack>
        {heldButReleased > 0 && (
          <Typography variant="caption" color="text.secondary">
            {formatRupees(heldButReleased)} held but released — some lines could not be confirmed.
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
