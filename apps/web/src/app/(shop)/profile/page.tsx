import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { disconnectZeptoAction } from "../../actions/zepto";
import { disconnectSwiggyAction } from "../../actions/swiggy";
import { logoutAction } from "../../actions/auth";
import { apiRead } from "../../../lib/api";
import { getCurrentClaims } from "../../../lib/session";
import { SwiggyConnectButton } from "../../swiggy-connect-button";
import { ZeptoConnectFlow } from "../../zepto-connect-flow";
import { LinkButton } from "../link-components";

interface ConnectionStatus {
  connected: boolean;
  connectedAt?: string;
}

function identityLabel(phone?: string): string {
  if (!phone) return "";
  if (phone.startsWith("zepto:")) return "Signed in with Zepto";
  if (phone.startsWith("swiggy:")) return "Signed in with Swiggy";
  if (phone.startsWith("anon:")) return "Browsing anonymously";
  return phone;
}

export default async function ProfilePage() {
  const claims = await getCurrentClaims();
  const [{ data: zeptoStatus }, { data: swiggyStatus }] = await Promise.all([
    apiRead<ConnectionStatus>("/connections/zepto/status"),
    apiRead<ConnectionStatus>("/connections/swiggy/status"),
  ]);

  return (
    <Box sx={{ p: 2, display: "grid", gap: 2 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {claims?.name ?? "Shopper"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {identityLabel(claims?.phone)}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Zepto
            </Typography>
            {zeptoStatus?.connected ? <Chip label="Connected" color="success" size="small" /> : <Chip label="Not connected" size="small" />}
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
                Connect your real Zepto account for live prices and stock.
              </Typography>
              <ZeptoConnectFlow buttonLabel="Connect Zepto" />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ display: "grid", gap: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Swiggy Instamart
            </Typography>
            {swiggyStatus?.connected ? <Chip label="Connected" color="success" size="small" /> : <Chip label="Not connected" size="small" />}
          </Stack>

          {swiggyStatus?.connected ? (
            <>
              <Typography variant="body2" color="text.secondary">
                QuickCart can search your real Swiggy Instamart account. Connected{" "}
                {swiggyStatus.connectedAt ? new Date(swiggyStatus.connectedAt).toLocaleString() : ""}.
              </Typography>
              <form action={disconnectSwiggyAction}>
                <Button type="submit" variant="outlined" color="error">
                  Disconnect Swiggy
                </Button>
              </form>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                Connect your real Swiggy account for live prices and stock.
              </Typography>
              <SwiggyConnectButton label="Connect Swiggy" />
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
