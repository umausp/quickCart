"use client";

import Chip from "@mui/material/Chip";
import BoltIcon from "@mui/icons-material/Bolt";
import { formatEta } from "../format.js";

export function EtaBadge({ minutes, size = "small" }: { minutes: number | null | undefined; size?: "small" | "medium" }) {
  return (
    <Chip
      icon={<BoltIcon fontSize="small" />}
      label={formatEta(minutes)}
      size={size}
      color="success"
      variant="outlined"
      sx={{ borderColor: "success.main", "& .MuiChip-icon": { color: "success.main" } }}
    />
  );
}
