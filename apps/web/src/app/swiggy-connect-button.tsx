import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { startSwiggyConnectAction } from "./actions/swiggy";

/**
 * Genuinely simpler than `ZeptoConnectFlow`: Swiggy's real OAuth redirect_uri is our own
 * hosted domain, so this is a plain top-level redirect + automatic callback
 * (`/connect/swiggy/callback`) — no popup, no paste-back box. A real `<form>` posting to a
 * Server Action works even before JS hydrates.
 */
export function SwiggyConnectButton({ label = "Continue with Swiggy" }: { label?: string }) {
  return (
    <Stack component="form" action={startSwiggyConnectAction}>
      <Button type="submit" variant="contained" size="large" fullWidth sx={{ bgcolor: "#fc8019", "&:hover": { bgcolor: "#e07216" } }}>
        {label}
      </Button>
    </Stack>
  );
}
