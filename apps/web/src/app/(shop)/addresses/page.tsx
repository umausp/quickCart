import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditIcon from "@mui/icons-material/Edit";
import type { Address } from "@quickcart/contracts";
import { EmptyState } from "@quickcart/ui";
import { apiRead } from "../../../lib/api";
import { deleteAddressAction, setDefaultAddressAction } from "../../actions/addresses";
import { LinkButton, LinkIconButton } from "../link-components";

export default async function AddressesPage() {
  const { data: addresses, session } = await apiRead<Address[]>("/addresses");
  if (!session) redirect("/login");

  return (
    <Box sx={{ px: 2, py: 2 }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          Saved addresses
        </Typography>
        <LinkButton href="/addresses/new" startIcon={<AddIcon />} size="small">
          Add new
        </LinkButton>
      </Stack>

      {!addresses || addresses.length === 0 ? (
        <EmptyState
          icon="📍"
          title="No saved addresses"
          subtitle="Add one so checkout is one tap next time."
          action={
            <LinkButton href="/addresses/new" variant="contained">
              Add address
            </LinkButton>
          }
        />
      ) : (
        <Stack spacing={1.5}>
          {addresses.map((address) => (
            <Box key={address.id} sx={{ p: 2, border: "1px solid #ececec", borderRadius: 2 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                <Box>
                  <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}>
                    <Chip size="small" label={address.label} />
                    {address.isDefault && <Chip size="small" color="success" label="Default" />}
                  </Stack>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {address.contactName} · {address.contactPhone}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {address.line1}
                    {address.line2 ? `, ${address.line2}` : ""}, {address.city}, {address.state} {address.pincode}
                  </Typography>
                </Box>
                <Stack direction="row">
                  <LinkIconButton href={`/addresses/${address.id}/edit`} size="small">
                    <EditIcon fontSize="small" />
                  </LinkIconButton>
                  <form action={deleteAddressAction}>
                    <input type="hidden" name="id" value={address.id} />
                    <IconButton type="submit" size="small" color="error">
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </form>
                </Stack>
              </Stack>
              {!address.isDefault && (
                <form action={setDefaultAddressAction}>
                  <input type="hidden" name="id" value={address.id} />
                  <Button type="submit" size="small" sx={{ mt: 1 }}>
                    Set as default
                  </Button>
                </form>
              )}
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
}
