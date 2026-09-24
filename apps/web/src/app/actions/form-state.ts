/**
 * Plain state shapes shared between a Server Action and the Client Component form that
 * calls it via `useActionState`. Kept out of the "use server" action files on purpose: a
 * "use server" module may only export async functions — a plain const like
 * `initialAddressFormState` fails the build if it lives there.
 */

export interface AddressFormState {
  error: string | null;
}
export const initialAddressFormState: AddressFormState = { error: null };

export interface PlaceOrderState {
  error: string | null;
}
export const initialPlaceOrderState: PlaceOrderState = { error: null };
