import { SignJWT, jwtVerify } from "jose";
import type { JwtPort } from "./auth/jwt-port.js";

/**
 * The Workers-deployment binding for `JWT_PORT` — `jose` is Web Crypto-native (works in
 * Workers without `nodejs_compat`), unlike `jsonwebtoken` (the Node deployment's binding,
 * see `auth.module.ts`). Same HS256 + shared-secret scheme either way.
 */
export function createJoseJwtPort(secret: string): JwtPort {
  const key = new TextEncoder().encode(secret);

  return {
    async sign(payload, options) {
      const jwt = new SignJWT(payload as Record<string, unknown>).setProtectedHeader({ alg: "HS256" }).setIssuedAt();
      if (options?.expiresIn !== undefined) jwt.setExpirationTime(options.expiresIn);
      return jwt.sign(key);
    },
    async verify<T>(token: string): Promise<T> {
      const { payload } = await jwtVerify(token, key);
      return payload as T;
    },
  };
}
