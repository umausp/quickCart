import { NextResponse, type NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AuthTokens } from "@quickcart/contracts";
import { API_BASE_URL } from "./lib/config";

const ACCESS_COOKIE = "qc_access";
const REFRESH_COOKIE = "qc_refresh";
const THIRTY_DAYS_SECONDS = 60 * 60 * 24 * 30;

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

interface FetcherLike {
  fetch: FetchLike;
}

/** Same reasoning as `lib/api.ts`'s `resolveFetch` — Worker-to-Worker calls on the same
 * `*.workers.dev` zone need the Service Binding, not a plain `fetch(url)` (error 1042).
 * `getCloudflareContext` throws outside a Workers runtime (plain `next dev`), so this falls
 * back to the global `fetch` there. */
async function resolveFetch(): Promise<FetchLike> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const service = (env as { API_SERVICE?: FetcherLike }).API_SERVICE;
    if (service) return service.fetch.bind(service);
  } catch {
    // not running on Workers
  }
  return fetch;
}

/**
 * Nobody should have to see a login screen just to browse QuickCart — search/product data
 * comes from a shared real Zepto connection when a visitor hasn't connected their own (see
 * ZeptoOAuthConfig.defaultOwnerUserId), but every visitor still needs *some* QuickCart
 * identity for their own local cart/addresses. This mints one silently on first visit, the
 * same way a typical e-commerce guest-cart cookie works, before any page even renders.
 */
export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.cookies.has(ACCESS_COOKIE)) return NextResponse.next();

  try {
    const fetchImpl = await resolveFetch();
    const res = await fetchImpl(`${API_BASE_URL}/auth/anonymous`, { method: "POST" });
    if (!res.ok) return NextResponse.next();

    const tokens = (await res.json()) as AuthTokens;
    const response = NextResponse.next();
    const cookieOpts = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", maxAge: THIRTY_DAYS_SECONDS };
    response.cookies.set(ACCESS_COOKIE, tokens.accessToken, cookieOpts);
    response.cookies.set(REFRESH_COOKIE, tokens.refreshToken, cookieOpts);
    return response;
  } catch {
    // API unreachable — fall through unauthenticated; (shop)/layout.tsx's own redirect to
    // /login remains as a safety net rather than breaking navigation entirely.
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
