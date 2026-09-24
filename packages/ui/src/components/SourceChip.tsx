"use client";

import Chip from "@mui/material/Chip";
import { SOURCE_META, type SourceId } from "@quickcart/contracts";

/** A company-branded chip — used as the Cart's per-company tab label and the Detail
 * screen's "Best via <source>" badge (Doc 01 §"Source brand chips"). */
export function SourceChip({ sourceId, size = "small" }: { sourceId: SourceId; size?: "small" | "medium" }) {
  const meta = SOURCE_META[sourceId];
  return (
    <Chip
      size={size}
      label={meta.label}
      sx={{ bgcolor: meta.color, color: "#fff", fontWeight: 700 }}
    />
  );
}
