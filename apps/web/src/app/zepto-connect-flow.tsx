"use client";

import { useState, useTransition, useActionState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { completeZeptoConnectAction, getZeptoAuthorizeUrlAction, type ZeptoConnectState } from "./actions/zepto";

const initialState: ZeptoConnectState = { error: null };

/**
 * The whole "Continue with Zepto" experience as one component, reused on both `/login` (where
 * it *is* the login) and `/profile` (linking an already-logged-in account). One page, one
 * flow: clicking the button opens Zepto's real sign-in in a new tab and immediately switches
 * *this* tab to the paste-back form — no separate navigation, no losing your place. See
 * `apps/api/src/zepto/zepto.config.ts` for why the paste-back step exists at all.
 */
export function ZeptoConnectFlow({ buttonLabel = "Continue with Zepto" }: { buttonLabel?: string }) {
  const [opened, setOpened] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [state, action, formPending] = useActionState(completeZeptoConnectAction, initialState);

  function handleConnectClick() {
    setLaunchError(null);
    startTransition(async () => {
      try {
        const { authorizeUrl } = await getZeptoAuthorizeUrlAction();
        const popup = window.open(authorizeUrl, "_blank", "noopener,noreferrer");
        if (!popup) {
          setLaunchError(`Your browser blocked the popup. Open this link yourself: ${authorizeUrl}`);
        }
        setOpened(true);
      } catch {
        setLaunchError("Could not start the Zepto connection. Try again.");
      }
    });
  }

  if (!opened) {
    return (
      <Stack spacing={1}>
        <Button
          onClick={handleConnectClick}
          disabled={pending}
          type="button"
          variant="contained"
          size="large"
          fullWidth
          sx={{ bgcolor: "#7b2ff7", "&:hover": { bgcolor: "#6a20e0" } }}
        >
          {pending ? "Opening Zepto…" : buttonLabel}
        </Button>
        {launchError && <Alert severity="error">{launchError}</Alert>}
      </Stack>
    );
  }

  return (
    <Stack component="form" action={action} spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        A new tab opened for Zepto sign-in. After you sign in there, that tab will fail to load
        (it tries to open a local address) — copy <strong>that tab&apos;s URL</strong> and paste it
        below.
      </Typography>
      <TextField
        name="redirectUrl"
        label="Pasted URL"
        placeholder="http://localhost/callback?code=...&state=..."
        multiline
        minRows={2}
        fullWidth
        autoFocus
      />
      {state.error && <Alert severity="error">{state.error}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={formPending} fullWidth>
        {formPending ? "Connecting…" : "Finish connecting"}
      </Button>
    </Stack>
  );
}
