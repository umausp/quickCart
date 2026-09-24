import { notFound } from "next/navigation";
import type { Address } from "@quickcart/contracts";
import { apiRead } from "../../../../../lib/api";
import { updateAddressAction } from "../../../../actions/addresses";
import { AddressForm } from "../../address-form";

export default async function EditAddressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: addresses } = await apiRead<Address[]>("/addresses");
  const address = addresses?.find((a) => a.id === id);
  if (!address) notFound();

  const boundUpdate = updateAddressAction.bind(null, id);
  return <AddressForm action={boundUpdate} address={address} submitLabel="Save changes" />;
}
