export interface ZeptoOAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  mcpUrl: string;
  scope: string;
  /** QuickCart userId whose real Zepto connection backs every visitor who hasn't connected
   * their own — an explicit, informed choice by that account's owner (see
   * `ZeptoOAuthService.getValidAccessTokenWithFallback`), not something to add lightly. Not
   * a secret itself (it's just a lookup key into our own KV; the real bearer token it
   * resolves to is never exposed to any client), but it does mean anyone who visits this site
   * without connecting their own account browses using this person's real Zepto data. */
  defaultOwnerUserId: string | null;
}

/**
 * `clientId` is a real, live public OAuth client registered against Zepto's real Dynamic
 * Client Registration endpoint (`https://auth.zepto.co.in/register`) — not a placeholder.
 * `redirectUri` is `http://localhost/callback`, one of the handful of URIs Zepto's own README
 * whitelists for exactly this "no hosted callback available" scenario (see
 * CLOUDFLARE-MIGRATION-PLAN.md's Zepto integration notes): QuickCart is a hosted web app, not
 * a local process, so it can't receive that redirect directly — the shopper's browser lands on
 * a "can't connect to localhost" page with the real authorization `code` sitting in the URL,
 * which they paste back into QuickCart to finish connecting. All of it — the client, the
 * endpoints, the redirect — is real; only the last hop is manual instead of automatic.
 */
const DEFAULT_ZEPTO_CONFIG: ZeptoOAuthConfig = {
  clientId: "74fec1f41455ce89af3ed3ed37f9ed9f",
  redirectUri: "http://localhost/callback",
  authorizeUrl: "https://auth.zepto.co.in/authorize",
  tokenUrl: "https://auth.zepto.co.in/token",
  mcpUrl: "https://mcp.zepto.co.in/mcp",
  scope: "tools:read tools:write dev.ucp.shopping.cart:manage",
  // The QuickCart account that completed the real OAuth handshake first, by explicit request
  // of that account's owner — every visitor who hasn't connected their own Zepto account sees
  // real search/product data sourced from this one instead of nothing.
  defaultOwnerUserId: "8143eb8b-9dad-424b-83f4-ec0ab67bcb85",
};

/** `env` is required (not read from a global) so this same function works verbatim on
 * Workers, which has no `process.env` — callers pass `process.env` on Node and the Worker's
 * own `Env` bindings object on Cloudflare. Every var is prefixed `ZEPTO_OAUTH_*`, not just
 * `ZEPTO_*`, so it can never collide with `worker.ts`'s existing `ZEPTO_MCP_URL` (the
 * *mock* zepto retailer's override, an unrelated, unauthenticated source). */
export function loadZeptoConfig(env: Record<string, string | undefined>): ZeptoOAuthConfig {
  return {
    clientId: env.ZEPTO_OAUTH_CLIENT_ID ?? DEFAULT_ZEPTO_CONFIG.clientId,
    redirectUri: env.ZEPTO_OAUTH_REDIRECT_URI ?? DEFAULT_ZEPTO_CONFIG.redirectUri,
    authorizeUrl: env.ZEPTO_OAUTH_AUTHORIZE_URL ?? DEFAULT_ZEPTO_CONFIG.authorizeUrl,
    tokenUrl: env.ZEPTO_OAUTH_TOKEN_URL ?? DEFAULT_ZEPTO_CONFIG.tokenUrl,
    mcpUrl: env.ZEPTO_OAUTH_MCP_URL ?? DEFAULT_ZEPTO_CONFIG.mcpUrl,
    scope: env.ZEPTO_OAUTH_SCOPE ?? DEFAULT_ZEPTO_CONFIG.scope,
    defaultOwnerUserId: env.ZEPTO_DEFAULT_OWNER_USER_ID ?? DEFAULT_ZEPTO_CONFIG.defaultOwnerUserId,
  };
}
