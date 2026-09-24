import { z } from "zod";

/**
 * Every stock/ETA/price call is location-scoped (Doc 04 §"To what extent can we use them?").
 * A query without at least a pincode is meaningless for hyperlocal quick-commerce stock.
 */
export const LocationSchema = z.object({
  lat: z.number().optional(),
  lng: z.number().optional(),
  pincode: z.string().min(3),
});
export type Location = z.infer<typeof LocationSchema>;

export function zoneKey(location: Location): string {
  return location.pincode;
}
