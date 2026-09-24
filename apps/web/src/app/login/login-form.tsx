"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { requestOtpAction, verifyOtpAction, type OtpRequestState, type OtpVerifyState } from "../actions/auth";

const initialRequestState: OtpRequestState = { error: null, devOtp: null, phone: "" };
const initialVerifyState: OtpVerifyState = { error: null, phone: "" };

export function LoginForm() {
  const [requestState, requestAction, requestPending] = useActionState(requestOtpAction, initialRequestState);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction, initialVerifyState);

  const step: "phone" | "otp" = requestState.devOtp ? "otp" : "phone";

  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", bgcolor: "background.default", px: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 380 }}>
        <Stack spacing={0.5} sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            🛒 QuickCart
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Everything, in minutes ⚡ — one search across five stores.
          </Typography>
        </Stack>

        {step === "phone" ? (
          <Stack component="form" action={requestAction} spacing={2}>
            <TextField
              name="phone"
              label="Phone number"
              placeholder="10-digit mobile number"
              defaultValue={requestState.phone}
              autoFocus
              fullWidth
              inputMode="numeric"
            />
            {requestState.error && <Alert severity="error">{requestState.error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={requestPending} fullWidth>
              {requestPending ? "Sending…" : "Send OTP"}
            </Button>
          </Stack>
        ) : (
          <Stack component="form" action={verifyAction} spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Code sent to {requestState.phone}.{" "}
              <a href="/login" style={{ color: "inherit" }}>
                Change number
              </a>
            </Typography>
            <input type="hidden" name="phone" value={requestState.phone} />
            <TextField
              name="otp"
              label="4-digit code"
              defaultValue={requestState.devOtp ?? ""}
              helperText={`Mock login — no SMS sent, dev code is ${requestState.devOtp}`}
              autoFocus
              fullWidth
              inputMode="numeric"
              slotProps={{ htmlInput: { maxLength: 4 } }}
            />
            {verifyState.error && <Alert severity="error">{verifyState.error}</Alert>}
            <Button type="submit" variant="contained" size="large" disabled={verifyPending} fullWidth>
              {verifyPending ? "Verifying…" : "Verify & continue"}
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
