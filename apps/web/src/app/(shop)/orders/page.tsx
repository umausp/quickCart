import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { OrderSummary } from "@quickcart/contracts";
import { EmptyState, SourceChip, formatEta, formatRupees } from "@quickcart/ui";
import { apiRead } from "../../../lib/api";
import { LinkBox, LinkButton } from "../link-components";

const STATUS_COLOR: Record<string, "success" | "warning" | "error" | "default"> = {
  CONFIRMED: "success",
  PARTIALLY_CONFIRMED: "warning",
  CANCELLED: "error",
};

export default async function OrdersPage() {
  const { data: orders, session } = await apiRead<OrderSummary[]>("/orders");
  if (!session) redirect("/login");

  return (
    <Box sx={{ px: 2, py: 2 }}>
      {!orders || orders.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No orders yet"
          subtitle="Your past orders will show up here."
          action={
            <LinkButton href="/home" variant="contained">
              Start shopping
            </LinkButton>
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {orders.map((order) => (
            <LinkBox
              key={order.orderId}
              href={`/orders/${order.orderId}`}
              sx={{ display: "block", textDecoration: "none", color: "inherit", p: 2, border: "1px solid #ececec", borderRadius: 2 }}
            >
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Order #{order.orderId.slice(0, 8)}
                </Typography>
                <Chip size="small" label={order.status.replace(/_/g, " ")} color={STATUS_COLOR[order.status] ?? "default"} />
              </Stack>
              <Stack direction="row" spacing={0.5} sx={{ mb: 1 }}>
                {order.sourceIds.map((s) => (
                  <SourceChip key={s} sourceId={s} />
                ))}
              </Stack>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" color="text.secondary">
                  {order.itemCount} item{order.itemCount === 1 ? "" : "s"} · {formatEta(order.combinedEtaMinutes)}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatRupees(order.totalPaise)}
                </Typography>
              </Stack>
            </LinkBox>
          ))}
        </Stack>
      )}
    </Box>
  );
}
