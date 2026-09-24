"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import type { Offer, RankedOffer } from "@quickcart/contracts";
import { SOURCE_META } from "@quickcart/contracts";
import { formatEta, formatRupees } from "../format.js";

/** One row of the Detail screen's "Compare N sources" block (Doc 01/05). `isBest` renders
 * the green "Best" badge; out-of-stock rows use the sibling `ExcludedSourceRow` instead. */
export function SourceCompareRow({ offer, isBest, actionSlot }: { offer: RankedOffer; isBest: boolean; actionSlot?: ReactNode }) {
  const meta = SOURCE_META[offer.source];
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        py: 1.25,
        px: 1,
        borderRadius: 2,
        bgcolor: isBest ? "success.50" : "transparent",
      }}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            bgcolor: meta.color,
            color: "#fff",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: "0.8rem",
          }}
        >
          {meta.label.slice(0, 2)}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {meta.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            In stock · {formatEta(offer.etaMinutes)} · {offer.deliveryFeePaise === 0 ? "Free delivery" : `${formatRupees(offer.deliveryFeePaise)} delivery`}
          </Typography>
        </Box>
      </Stack>
      <Stack spacing={0.5} sx={{ alignItems: "flex-end" }}>
        <Typography variant="body1" sx={{ fontWeight: 800 }}>
          {formatRupees(offer.pricePaise)}
        </Typography>
        {isBest ? (
          <Chip size="small" label="Best" color="success" />
        ) : (
          <Typography variant="caption" color="text.secondary">
            {formatRupees(offer.landedPaise)} landed
          </Typography>
        )}
        {actionSlot}
      </Stack>
    </Box>
  );
}

export function ExcludedSourceRow({ offer }: { offer: Offer }) {
  const meta = SOURCE_META[offer.source];
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.25, px: 1, opacity: 0.6 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
        <Box
          sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: meta.color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8rem" }}
        >
          {meta.label.slice(0, 2)}
        </Box>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {meta.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Out of stock in your area
          </Typography>
        </Box>
      </Stack>
      <Chip size="small" label="excluded" variant="outlined" />
    </Box>
  );
}
