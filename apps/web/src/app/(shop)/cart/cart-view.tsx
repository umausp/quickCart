"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import type { CartView as CartViewData } from "@quickcart/contracts";
import { EmptyState, SourceChip, formatEta, formatRupees } from "@quickcart/ui";
import { removeCartItemAction, updateCartQtyAction } from "../../actions/cart";

/**
 * The single cart, tabbed by company: one MUI tab per source group, each showing only that
 * company's lines + its own subtotal/ETA, with a combined total/ETA footer spanning all of
 * them (the plan's Phase 3/5 centerpiece requirement).
 */
export function CartView({ cart }: { cart: CartViewData }) {
  const [tab, setTab] = useState(0);

  if (cart.groups.length === 0) {
    return (
      <Box sx={{ px: 2 }}>
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          subtitle="Add something from Home or Search to get started."
          action={
            <Button component={Link} href="/home" variant="contained">
              Browse products
            </Button>
          }
        />
      </Box>
    );
  }

  const activeIndex = Math.min(tab, cart.groups.length - 1);
  const group = cart.groups[activeIndex]!;

  return (
    <Stack spacing={2} sx={{ px: 2, py: 2, pb: 12 }}>
      <Tabs value={activeIndex} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
        {cart.groups.map((g, i) => (
          <Tab key={g.sourceId} value={i} label={<SourceChip sourceId={g.sourceId} />} sx={{ minHeight: 48 }} />
        ))}
      </Tabs>

      <Stack spacing={1.5}>
        {group.lines.map((line) => (
          <Box key={line.lineId} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5, border: "1px solid #ececec", borderRadius: 2 }}>
            <Box sx={{ fontSize: "2rem" }}>{line.image}</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {line.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {line.packSize} · {formatRupees(line.unitPricePaise)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
              <form action={updateCartQtyAction}>
                <input type="hidden" name="lineId" value={line.lineId} />
                <input type="hidden" name="qty" value={line.qty - 1} />
                <IconButton size="small" type="submit" aria-label="Decrease quantity">
                  <RemoveIcon fontSize="small" />
                </IconButton>
              </form>
              <Typography variant="body2" sx={{ minWidth: 22, textAlign: "center" }}>
                {line.qty}
              </Typography>
              <form action={updateCartQtyAction}>
                <input type="hidden" name="lineId" value={line.lineId} />
                <input type="hidden" name="qty" value={line.qty + 1} />
                <IconButton size="small" type="submit" aria-label="Increase quantity">
                  <AddIcon fontSize="small" />
                </IconButton>
              </form>
              <form action={removeCartItemAction}>
                <input type="hidden" name="lineId" value={line.lineId} />
                <IconButton size="small" type="submit" color="error" aria-label="Remove item">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </form>
            </Stack>
          </Box>
        ))}

        <Stack direction="row" sx={{ justifyContent: "space-between", px: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {group.label} subtotal · {formatEta(group.etaMinutes)}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {formatRupees(group.subtotalPaise)}
          </Typography>
        </Stack>
      </Stack>

      <Box
        sx={{
          position: "fixed",
          bottom: 56,
          left: 0,
          right: 0,
          bgcolor: "background.paper",
          borderTop: "1px solid #eee",
          p: 2,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary">
            Combined total · {formatEta(cart.combinedEtaMinutes)}
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 800 }}>
            {formatRupees(cart.combinedTotalPaise)}
          </Typography>
        </Box>
        <Button component={Link} href="/checkout" variant="contained" size="large">
          Checkout
        </Button>
      </Box>
    </Stack>
  );
}
