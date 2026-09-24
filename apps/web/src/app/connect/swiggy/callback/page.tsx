import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { completeSwiggyConnectAction } from "../../../actions/swiggy";

/**
 * The real OAuth redirect target — Swiggy's own login page sends the browser straight here
 * with `?code&state` after a successful sign-in (no manual paste-back, unlike Zepto's
 * equivalent flow). This page's only job is to exchange that code server-side and redirect
 * into the app; see `SwiggyOAuthConfig.redirectUri`.
 */
export default async function SwiggyCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; state?: string; error?: string; error_description?: string }>;
}) {
  const { code, state, error, error_description: errorDescription } = await searchParams;

  if (error) {
    return <CallbackError message={errorDescription ?? error} />;
  }
  if (!code || !state) {
    return <CallbackError message="Swiggy didn't send back a code — try connecting again." />;
  }

  try {
    await completeSwiggyConnectAction(code, state);
  } catch {
    return <CallbackError message="Could not complete the connection — the code may have expired." />;
  }

  redirect("/home");
}

function CallbackError({ message }: { message: string }) {
  return (
    <Box sx={{ display: "grid", placeItems: "center", minHeight: "100vh", px: 3, textAlign: "center" }}>
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
          Couldn&apos;t connect Swiggy
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {message}
        </Typography>
        <Button component={Link} href="/profile" variant="contained">
          Back to Profile
        </Button>
      </Box>
    </Box>
  );
}
