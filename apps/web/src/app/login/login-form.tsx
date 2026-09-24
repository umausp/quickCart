"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ZeptoConnectFlow } from "../zepto-connect-flow";

/** Phone/OTP login still exists (`actions/auth.ts`, `AuthService.requestOtp`/`verifyOtp`) but
 * is deliberately not rendered here right now — Zepto is the only login path while that
 * integration is what's being exercised. Bringing the phone form back is just re-adding its
 * JSX; nothing backend-side was removed. */
export function LoginForm() {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", bgcolor: "background.default", px: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 420 }}>
        <Stack spacing={0.5} sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            🛒 QuickCart
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everything, in minutes ⚡ — one search across five stores.
          </Typography>
        </Stack>

        <ZeptoConnectFlow />
      </Box>
    </Box>
  );
}
