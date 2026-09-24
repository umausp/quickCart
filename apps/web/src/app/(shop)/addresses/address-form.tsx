"use client";

import { useActionState } from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import type { Address } from "@quickcart/contracts";
import { initialAddressFormState, type AddressFormState } from "../../actions/form-state";

/** Shared by both Add and Edit address screens (Doc: "same component, add just posts
 * without an id" — the bound Server Action is the only difference). */
export function AddressForm({
  action,
  address,
  submitLabel,
}: {
  action: (prev: AddressFormState, formData: FormData) => Promise<AddressFormState>;
  address?: Address;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialAddressFormState);

  return (
    <Stack component="form" action={formAction} spacing={2} sx={{ px: 2, py: 2, maxWidth: 480 }}>
      <TextField name="label" label="Label" select defaultValue={address?.label ?? "home"} fullWidth>
        <MenuItem value="home">Home</MenuItem>
        <MenuItem value="work">Work</MenuItem>
        <MenuItem value="other">Other</MenuItem>
      </TextField>
      <TextField name="contactName" label="Contact name" defaultValue={address?.contactName} required fullWidth />
      <TextField name="contactPhone" label="Contact phone" defaultValue={address?.contactPhone} required fullWidth />
      <TextField name="line1" label="Address line 1" defaultValue={address?.line1} required fullWidth />
      <TextField name="line2" label="Address line 2 (optional)" defaultValue={address?.line2} fullWidth />
      <Stack direction="row" spacing={2}>
        <TextField name="city" label="City" defaultValue={address?.city} required fullWidth />
        <TextField name="state" label="State" defaultValue={address?.state} required fullWidth />
      </Stack>
      <TextField name="pincode" label="Pincode" defaultValue={address?.pincode} required fullWidth />
      <FormControlLabel control={<Checkbox name="isDefault" defaultChecked={address?.isDefault} />} label="Set as default address" />
      {state.error && <Alert severity="error">{state.error}</Alert>}
      <Button type="submit" variant="contained" size="large" disabled={pending}>
        {pending ? "Saving…" : submitLabel}
      </Button>
    </Stack>
  );
}
