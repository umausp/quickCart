"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";

export function EmptyState({ icon, title, subtitle, action }: { icon: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <Stack spacing={1.5} sx={{ py: 8, textAlign: "center", alignItems: "center" }}>
      <Box sx={{ fontSize: "3rem" }}>{icon}</Box>
      <Typography variant="h6" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
          {subtitle}
        </Typography>
      )}
      {action}
    </Stack>
  );
}
