"use client";

import type { ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import type { SearchResultCard } from "@quickcart/contracts";
import { EtaBadge } from "./EtaBadge.js";
import { PriceBlock } from "./PriceBlock.js";
import { SOURCE_META } from "@quickcart/contracts";

/**
 * The Home/List card (Doc 01 §"Home"/"List"): thumb, ETA badge, title, pack size, price
 * block, "Best via <source>" label. `actionSlot` is left to the page (usually an "Add +"
 * button wrapped in a `<form action={serverAction}>`) so this stays framework-agnostic.
 */
export function ProductCard({ card, onClick, actionSlot }: { card: SearchResultCard; onClick?: () => void; actionSlot?: ReactNode }) {
  const best = card.best;
  const sourceLabel = SOURCE_META[best.source].label;
  return (
    <Card onClick={onClick} sx={{ cursor: onClick ? "pointer" : "default", height: "100%" }}>
      <CardContent>
        <Stack spacing={1}>
          <Box
            sx={{
              height: 96,
              borderRadius: 3,
              bgcolor: "grey.100",
              display: "grid",
              placeItems: "center",
              fontSize: "2.25rem",
              position: "relative",
            }}
          >
            {card.image}
            <Box sx={{ position: "absolute", top: 8, right: 8 }}>
              <EtaBadge minutes={best.etaMinutes} />
            </Box>
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3, minHeight: "2.6em" }}>
            {card.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {card.packSize}
          </Typography>
          <PriceBlock pricePaise={best.pricePaise} mrpPaise={best.mrpPaise} />
          <Typography variant="caption" color="text.secondary">
            Best via {sourceLabel}
            {card.sourcesReturned < card.sourcesQueried ? ` · ${card.sourcesReturned}/${card.sourcesQueried} sources` : ""}
          </Typography>
          {actionSlot}
        </Stack>
      </CardContent>
    </Card>
  );
}
