"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import type { SxProps, Theme } from "@mui/material/styles";

/**
 * MUI's `component={Link}` polymorphic prop passes a *function reference* as a prop — that
 * can't cross the Server→Client Component boundary (only JSX children get that special
 * treatment). Every page that renders a link-as-button/chip/box from a Server Component
 * routes through one of these small Client Component wrappers instead, so only plain
 * serializable strings cross the boundary.
 */

export function LinkButton({
  href,
  children,
  variant,
  size,
  startIcon,
  sx,
}: {
  href: string;
  children: ReactNode;
  variant?: "text" | "outlined" | "contained";
  size?: "small" | "medium" | "large";
  startIcon?: ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Button component={Link} href={href} variant={variant} size={size} startIcon={startIcon} sx={sx}>
      {children}
    </Button>
  );
}

export function LinkIconButton({ href, children, size, color }: { href: string; children: ReactNode; size?: "small" | "medium" | "large"; color?: "error" }) {
  return (
    <IconButton component={Link} href={href} size={size} color={color}>
      {children}
    </IconButton>
  );
}

export function LinkChip({
  href,
  label,
  color,
  variant,
}: {
  href: string;
  label: string;
  color?: "primary" | "default";
  variant?: "filled" | "outlined";
}) {
  return <Chip component={Link} href={href} label={label} clickable color={color} variant={variant} />;
}

export function LinkBox({ href, children, sx }: { href: string; children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Box component={Link} href={href} sx={sx}>
      {children}
    </Box>
  );
}
