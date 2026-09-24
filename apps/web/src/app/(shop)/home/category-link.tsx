"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type { Category } from "@quickcart/contracts";

/** `category.id` doubles as a free-text query — the search backend matches it against each
 * listing's category slug, so this is a real filtered search, not a separate code path. */
export function CategoryLink({ category }: { category: Category }) {
  return (
    <Card
      component={Link}
      href={`/search/results?q=${encodeURIComponent(category.id)}`}
      elevation={0}
      sx={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        p: 1.5,
        border: "1px solid #f0f0f0",
        borderRadius: 3,
        transition: "transform 0.15s, box-shadow 0.15s",
        "&:hover": { transform: "translateY(-2px)", boxShadow: 2 },
      }}
    >
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          bgcolor: "grey.100",
          display: "grid",
          placeItems: "center",
          fontSize: "1.75rem",
        }}
      >
        {category.icon}
      </Box>
      <Typography variant="caption" sx={{ textAlign: "center", fontWeight: 600, lineHeight: 1.2 }}>
        {category.name}
      </Typography>
    </Card>
  );
}
