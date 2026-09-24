"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { completeZeptoConnectAction, type ZeptoConnectState } from "../../../actions/zepto";

const initialState: ZeptoConnectState = { error: null };

export function FinishZeptoConnectForm() {
  const [state, action, pending] = useActionState(completeZeptoConnectAction, initialState);

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", bgcolor: "background.default", px: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 480 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
          Almost there
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          After signing in to Zepto, your browser tried to open a page at{" "}
          <code>localhost/callback</code> and probably showed a &quot;can&apos;t connect&quot;
          or &quot;this site can&apos;t be reached&quot; error — that&apos;s expected. Copy the
          full address from that tab&apos;s address bar and paste it below.
        </Typography>
        <Stack component="form" action={action} spacing={2}>
          <TextField
            name="redirectUrl"
            label="Pasted URL (or just the code)"
            placeholder="http://localhost/callback?code=...&state=..."
            autoFocus
            fullWidth
            multiline
            minRows={2}
          />
          {state.error && <Alert severity="error">{state.error}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth>
            {pending ? "Connecting…" : "Finish connecting"}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
