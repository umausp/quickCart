import { createAddressAction } from "../../../actions/addresses";
import { AddressForm } from "../address-form";

export default function NewAddressPage() {
  return <AddressForm action={createAddressAction} submitLabel="Save address" />;
}
