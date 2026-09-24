"use client";

import type { MouseEvent } from "react";
import Button from "@mui/material/Button";
import type { SourceId } from "@quickcart/contracts";
import { addToCartAction } from "../actions/cart";

/**
 * A self-contained progressive-enhancement form: works with plain HTML semantics (a real
 * `<form>` posting to a Server Action), stops click-through when nested inside a clickable
 * `ProductCard`.
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
  function stop(e: MouseEvent<HTMLButtonElement>): void {
    e.stopPropagation();
  }

  return (
    <form action={addToCartAction}>
      <input type="hidden" name="canonicalSku" value={canonicalSku} />
      <input type="hidden" name="sourceId" value={sourceId} />
      <input type="hidden" name="sourceProductId" value={sourceProductId} />
      <input type="hidden" name="qty" value={qty} />
      <Button type="submit" size="small" variant="contained" fullWidth={fullWidth} onClick={stop}>
        {label}
      </Button>
    </form>
  );
}
