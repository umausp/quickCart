export interface SwiggyOAuthConfig {
  clientId: string;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  mcpUrl: string;
  scope: string;
  /** Same concept as `ZeptoOAuthConfig.defaultOwnerUserId` — the QuickCart account whose real
   * Swiggy connection backs every visitor who hasn't connected their own. `null` until
   * someone actually completes the real OAuth handshake once (a human has to do this — see
   * SwiggyOAuthService's doc comment), then hardcoded here the same way Zepto's was. */
  defaultOwnerUserId: string | null;
}

/**
 * All real, confirmed live against `mcp.swiggy.com` (not guessed): `clientId` came back from
 * a real Dynamic Client Registration call against `https://mcp.swiggy.com/auth/register`
 * (interestingly a fixed value, "swiggy-mcp", the same for every registration attempt rather
 * than a per-caller id like Zepto's). Unlike Zepto, Swiggy's DCR accepted our own real hosted
 * domain as a redirect_uri directly — confirmed by actually registering it and loading the
 * resulting `/auth/authorize` URL, which returned a genuine "Swiggy - Sign in to continue"
 * page. That means this integration needs no manual paste-back step at all: the OAuth
 * callback lands straight on `redirectUri` below with `?code&state` in the query string.
 */
const DEFAULT_SWIGGY_CONFIG: SwiggyOAuthConfig = {
  clientId: "swiggy-mcp",
  redirectUri: "https://quickcart-web.pathakumashankar.workers.dev/connect/swiggy/callback",
  authorizeUrl: "https://mcp.swiggy.com/auth/authorize",
  tokenUrl: "https://mcp.swiggy.com/auth/token",
  mcpUrl: "https://mcp.swiggy.com/im",
  scope: "mcp:tools mcp:resources mcp:prompts",
  defaultOwnerUserId: null,
};

/** `env` is required (not read from a global) so this same function works verbatim on
 * Workers, which has no `process.env` — callers pass `process.env` on Node and the Worker's
 * own `Env` bindings object on Cloudflare. Every var is prefixed `SWIGGY_OAUTH_*` for the
 * same collision-avoidance reason as `zepto.config.ts`'s `ZEPTO_OAUTH_*`. */
export function loadSwiggyConfig(env: Record<string, string | undefined>): SwiggyOAuthConfig {
  return {
    clientId: env.SWIGGY_OAUTH_CLIENT_ID ?? DEFAULT_SWIGGY_CONFIG.clientId,
    redirectUri: env.SWIGGY_OAUTH_REDIRECT_URI ?? DEFAULT_SWIGGY_CONFIG.redirectUri,
    authorizeUrl: env.SWIGGY_OAUTH_AUTHORIZE_URL ?? DEFAULT_SWIGGY_CONFIG.authorizeUrl,
    tokenUrl: env.SWIGGY_OAUTH_TOKEN_URL ?? DEFAULT_SWIGGY_CONFIG.tokenUrl,
    mcpUrl: env.SWIGGY_OAUTH_MCP_URL ?? DEFAULT_SWIGGY_CONFIG.mcpUrl,
    scope: env.SWIGGY_OAUTH_SCOPE ?? DEFAULT_SWIGGY_CONFIG.scope,
    defaultOwnerUserId: env.SWIGGY_DEFAULT_OWNER_USER_ID ?? DEFAULT_SWIGGY_CONFIG.defaultOwnerUserId,
  };
}
