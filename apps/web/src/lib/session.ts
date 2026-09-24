import "server-only";
import { cookies } from "next/headers";
import type { AuthTokens } from "@quickcart/contracts";

/**
 * The BFF's whole job in three functions: hold the JWT pair in httpOnly cookies so the
 * browser never sees them ("everything should be inside our BE, UI is just showing UI" —
 * this is the securely part). Only callable from Server Actions/Route Handlers when writing
 * (Next.js forbids cookie mutation during a plain render); reading is safe everywhere.
 */
const ACCESS_COOKIE = "qc_access";
const REFRESH_COOKIE = "qc_refresh";

const baseCookieOpts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export interface Session {
  accessToken: string;
  refreshToken: string;
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const accessToken = store.get(ACCESS_COOKIE)?.value;
  const refreshToken = store.get(REFRESH_COOKIE)?.value;
  if (!accessToken || !refreshToken) return null;
  return { accessToken, refreshToken };
}

export async function setSession(tokens: AuthTokens): Promise<void> {
  const store = await cookies();
  store.set(ACCESS_COOKIE, tokens.accessToken, { ...baseCookieOpts, maxAge: 60 * 15 });
  store.set(REFRESH_COOKIE, tokens.refreshToken, { ...baseCookieOpts, maxAge: 60 * 60 * 24 * 30 });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}
