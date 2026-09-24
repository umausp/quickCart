"use client";

import type { MouseEvent } from "react";
import { useActionState } from "react";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import type { SourceId } from "@quickcart/contracts";
import { addToCartAction, type AddToCartState } from "../actions/cart";

const initialState: AddToCartState = { error: null };

/**
 * A self-contained progressive-enhancement form: works with plain HTML semantics (a real
 * `<form>` posting to a Server Action), stops click-through when nested inside a clickable
 * `ProductCard`. Bound via `useActionState` so a failure (out of stock, a stale product id)
 * shows inline instead of crashing to Next's generic error screen.
 */
export function AddToCartButton({
  canonicalSku,
  sourceId,
  sourceProductId,
  qty = 1,
  label = "Add +",
  fullWidth = true,
}: {
  canonicalSku: string;
  sourceId: SourceId;
  sourceProductId: string;
  qty?: number;
  label?: string;
  fullWidth?: boolean;
}) {
  const [state, action, pending] = useActionState(addToCartAction, initialState);

  function stop(e: MouseEvent<HTMLButtonElement>): void {
    e.stopPropagation();
  }

  return (
    <form action={action}>
      <input type="hidden" name="canonicalSku" value={canonicalSku} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <input type="hidden" name="sourceProductId" value={sourceProductId} />
      <input type="hidden" name="qty" value={qty} />
      <Button type="submit" size="small" variant="contained" fullWidth={fullWidth} disabled={pending} onClick={stop}>
        {pending ? "Adding…" : label}
      </Button>
      {state.error && (
        <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>
          {state.error}
        </Typography>
      )}
    </form>
  );
}
