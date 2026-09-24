import { z } from "zod";

/**
 * A saved delivery address. Orders never point at a live Address row — checkout snapshots
 * the fields it needs onto the Order itself (see order.ts) so editing/deleting a saved
 * address later can never retroactively change a past order.
 */
export const AddressLabelSchema = z.enum(["home", "work", "other"]);
export type AddressLabel = z.infer<typeof AddressLabelSchema>;

export const AddressSchema = z.object({
  id: z.string(),
  userId: z.string(),
  label: AddressLabelSchema,
  contactName: z.string(),
  contactPhone: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pincode: z.string().min(3),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Address = z.infer<typeof AddressSchema>;

/** Body for both "add address" and "edit address" — id/userId/timestamps are server-assigned. */
export const UpsertAddressSchema = z.object({
  label: AddressLabelSchema.default("home"),
  contactName: z.string().min(1),
  contactPhone: z.string().min(10).max(15),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(3),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().default(false),
});
export type UpsertAddressInput = z.infer<typeof UpsertAddressSchema>;

/** The immutable snapshot an Order carries — copied from an Address at checkout time. */
export const AddressSnapshotSchema = z.object({
  label: AddressLabelSchema,
  contactName: z.string(),
  contactPhone: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
});
export type AddressSnapshot = z.infer<typeof AddressSnapshotSchema>;

export function toAddressSnapshot(address: Address): AddressSnapshot {
  return {
    label: address.label,
    contactName: address.contactName,
    contactPhone: address.contactPhone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
  };
}
