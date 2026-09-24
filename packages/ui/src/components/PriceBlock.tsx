"use client";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { formatRupees, formatSavings } from "../format.js";

export function PriceBlock({ pricePaise, mrpPaise }: { pricePaise: number; mrpPaise: number }) {
  const savings = formatSavings(mrpPaise, pricePaise);
  return (
    <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
      <Typography variant="h6" component="span" sx={{ fontWeight: 800 }}>
        {formatRupees(pricePaise)}
      </Typography>
      {mrpPaise > pricePaise && (
        <Typography variant="body2" component="span" sx={{ textDecoration: "line-through", color: "text.secondary" }}>
          {formatRupees(mrpPaise)}
        </Typography>
      )}
      {savings && <Chip size="small" label={savings} color="success" variant="outlined" />}
    </Box>
  );
}
