"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Address, CartView as CartViewData } from "@quickcart/contracts";
import { EmptyState, SourceChip, formatEta, formatRupees } from "@quickcart/ui";
import { placeOrderAction } from "../../actions/orders";
import { initialPlaceOrderState } from "../../actions/form-state";

export function CheckoutForm({
  cart,
  addresses,
  defaultAddressId,
  idempotencyKey,
}: {
  cart: CartViewData;
  addresses: Address[];
  defaultAddressId: string;
  idempotencyKey: string;
}) {
  const [selected, setSelected] = useState(defaultAddressId);
  const [state, formAction, pending] = useActionState(placeOrderAction, initialPlaceOrderState);

  return (
    <Stack component="form" action={formAction} spacing={2} sx={{ maxWidth: 560 }}>
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="addressId" value={selected} />

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Delivery address
      </Typography>
      {addresses.length === 0 ? (
        <EmptyState
          icon="📍"
          title="No saved address"
          subtitle="Add one to continue."
          action={
            <Button component={Link} href="/addresses/new" variant="contained">
              Add address
            </Button>
          }
        />
      ) : (
        <RadioGroup value={selected} onChange={(e) => setSelected(e.target.value)}>
          {addresses.map((a) => (
            <FormControlLabel
              key={a.id}
              value={a.id}
              control={<Radio />}
              sx={{ border: "1px solid #ececec", borderRadius: 2, mb: 1, mx: 0, px: 1.5, alignItems: "flex-start" }}
              label={
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {a.label} · {a.contactName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {a.line1}, {a.city} {a.pincode}
                  </Typography>
                </Box>
              }
            />
          ))}
        </RadioGroup>
      )}
      <Button component={Link} href="/addresses/new" size="small" sx={{ alignSelf: "flex-start" }}>
        + Add another address
      </Button>

      <Divider />

      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        Order summary
      </Typography>
      <Stack spacing={1}>
        {cart.groups.map((g) => (
          <Stack key={g.sourceId} direction="row" sx={{ justifyContent: "space-between" }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <SourceChip sourceId={g.sourceId} />
              <Typography variant="caption" color="text.secondary">
                {g.lines.length} item{g.lines.length === 1 ? "" : "s"} · {formatEta(g.etaMinutes)}
              </Typography>
            </Stack>
            <Typography variant="body2">{formatRupees(g.subtotalPaise)}</Typography>
          </Stack>
        ))}
      </Stack>
      <Divider />
      <Stack direction="row" sx={{ justifyContent: "space-between" }}>
        <Typography variant="body1" sx={{ fontWeight: 800 }}>
          Total
        </Typography>
        <Typography variant="body1" sx={{ fontWeight: 800 }}>
          {formatRupees(cart.combinedTotalPaise)}
        </Typography>
      </Stack>

      {state.error && <Alert severity="error">{state.error}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={pending || !selected}>
        {pending ? "Placing order…" : `Place order · ${formatRupees(cart.combinedTotalPaise)}`}
      </Button>
    </Stack>
  );
}
