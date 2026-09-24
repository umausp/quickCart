"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { Category } from "@quickcart/contracts";

/** `category.id` doubles as a free-text query — the search backend matches it against each
 * listing's category slug, so this is a real filtered search, not a separate code path. */
export function CategoryLink({ category }: { category: Category }) {
  return (
    <Box
      component={Link}
      href={`/search/results?q=${category.id}`}
      sx={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}
    >
      <Box sx={{ width: 56, height: 56, borderRadius: "50%", bgcolor: "grey.100", display: "grid", placeItems: "center", fontSize: "1.5rem" }}>{category.icon}</Box>
      <Typography variant="caption" sx={{ textAlign: "center" }}>
        {category.name}
      </Typography>
    </Box>
  );
}
