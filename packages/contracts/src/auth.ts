import { z } from "zod";

export const UserSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string(),
  defaultPincode: z.string(),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

/** Claims embedded in the access JWT (Doc 03 §"Connection & auth handshake"). */
export const JwtClaimsSchema = z.object({
  sub: z.string(),
  phone: z.string(),
  name: z.string(),
  deliveryZone: z.string(),
});
export type JwtClaims = z.infer<typeof JwtClaimsSchema>;

export const RequestOtpSchema = z.object({ phone: z.string().min(10).max(15) });
export type RequestOtpInput = z.infer<typeof RequestOtpSchema>;

export const VerifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(4),
  pincode: z.string().min(3).default("560001"),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: UserSchema,
});
export type AuthTokens = z.infer<typeof AuthTokensSchema>;
