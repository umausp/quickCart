/**
 * OAuth 2.1 + PKCE (RFC 7636) primitives for the real Zepto integration — pure Web Crypto, so
 * the exact same code runs unmodified on Node (`main.ts`) and on Workers (`worker.ts`), same
 * reasoning as `crypto.randomUUID()` elsewhere in this codebase.
 */

function base64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomCodeVerifier(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function codeChallengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

export function randomState(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(16)));
}

/**
 * Unverified decode of a JWT's `sub` claim — used only to derive a stable key for reattaching
 * the same QuickCart account on a repeat "Continue with Zepto" login. Never trusted for
 * authorization: every real Zepto MCP call still sends the token itself, which Zepto's own
 * server validates. If Zepto's access token isn't a decodable JWT, this just returns `null`
 * and the caller falls back to minting a fresh account for that login.
 */
export function decodeJwtSubject(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = atob(parts[1]!.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as Record<string, unknown>;
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
