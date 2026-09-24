import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { disconnectZeptoAction } from "../../actions/zepto";
import { logoutAction } from "../../actions/auth";
import { apiRead } from "../../../lib/api";
import { getCurrentClaims } from "../../../lib/session";
import { ZeptoConnectFlow } from "../../zepto-connect-flow";
import { LinkButton } from "../link-components";

interface ZeptoStatus {
  connected: boolean;
  connectedAt?: string;
}

export default async function ProfilePage() {
  const claims = await getCurrentClaims();
  const { data: zeptoStatus } = await apiRead<ZeptoStatus>("/connections/zepto/status");

  return (
    <Box sx={{ p: 2, display: "grid", gap: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {claims?.name ?? "Shopper"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {claims?.phone?.startsWith("zepto:") ? "Signed in with Zepto" : claims?.phone}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Zepto
            </Typography>
            {zeptoStatus?.connected ? (
              <Chip label="Connected" color="success" size="small" />
            ) : (
              <Chip label="Not connected" size="small" />
            )}
          </Stack>

          {zeptoStatus?.connected ? (
            <>
              <Typography variant="body2" color="text.secondary">
                QuickCart can search and shop your real Zepto account. Connected{" "}
                {zeptoStatus.connectedAt ? new Date(zeptoStatus.connectedAt).toLocaleString() : ""}.
              </Typography>
              <form action={disconnectZeptoAction}>
                <Button type="submit" variant="outlined" color="error">
                  Disconnect Zepto
                </Button>
              </form>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Connect your real Zepto account for live prices, stock and checkout. Without it,
                QuickCart still shows Zepto&apos;s demo catalogue alongside the other four stores.
              </Typography>
              <ZeptoConnectFlow buttonLabel="Connect Zepto" />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Account
          </Typography>
          <LinkButton href="/addresses" variant="outlined">
            Manage addresses
          </LinkButton>
          <form action={logoutAction}>
            <Button type="submit" variant="text" color="error">
              Log out
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
