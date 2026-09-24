import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { OAuthConnection, OAuthConnectionPort, UserRepositoryPort } from "@quickcart/domain";
import type { AuthTokens, User } from "@quickcart/contracts";
import { USER_REPOSITORY } from "../auth/auth.tokens.js";
import { AuthService } from "../auth/auth.service.js";
import { codeChallengeFor, decodeJwtSubject, randomCodeVerifier, randomState } from "../oauth/pkce.js";
import type { SwiggyOAuthConfig } from "./swiggy.config.js";
import { SWIGGY_CONFIG, SWIGGY_CONNECTION } from "./swiggy.tokens.js";

const STATE_TTL_SECONDS = 600;

interface SwiggyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

/**
 * Drives the real OAuth 2.1 + PKCE handshake against `mcp.swiggy.com/auth` — genuinely
 * simpler than Zepto's equivalent (`ZeptoOAuthService`) because Swiggy's Dynamic Client
 * Registration accepted our own real hosted domain as a redirect_uri (confirmed live), so
 * there's no manual paste-back step: the browser lands straight back on
 * `SwiggyOAuthConfig.redirectUri` with `?code&state` in the query string. Same "doubles as a
 * QuickCart login" behaviour as Zepto — see `completeConnect`.
 */
@Injectable()
export class SwiggyOAuthService {
  constructor(
    @Inject(SWIGGY_CONNECTION) private readonly connections: OAuthConnectionPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly auth: AuthService,
    @Inject(SWIGGY_CONFIG) private readonly config: SwiggyOAuthConfig,
  ) {}

  async beginConnect(existingUserId: string | null): Promise<{ authorizeUrl: string }> {
    const verifier = randomCodeVerifier();
    const challenge = await codeChallengeFor(verifier);
    const state = randomState();
    await this.connections.saveState(state, { codeVerifier: verifier, userId: existingUserId }, STATE_TTL_SECONDS);

    const url = new URL(this.config.authorizeUrl);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    url.searchParams.set("state", state);
    url.searchParams.set("scope", this.config.scope);
    // RFC 8707 Resource Indicator — Zepto's server issues a token with the wrong `aud` claim
    // without this (confirmed live, see CLOUDFLARE-MIGRATION-PLAN.md); sending it here too on
    // the assumption Swiggy's real server has the same requirement rather than finding out the
    // same way twice.
    url.searchParams.set("resource", this.config.mcpUrl);
    return { authorizeUrl: url.toString() };
  }

  async completeConnect(code: string, state: string): Promise<AuthTokens> {
    const pending = await this.connections.consumeState(state);
    if (!pending) throw new BadRequestException({ error: "invalid_or_expired_state" });

    const token = await this.exchangeToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri,
      client_id: this.config.clientId,
      code_verifier: pending.codeVerifier,
      resource: this.config.mcpUrl,
    });

    const user = pending.userId ? await this.mustFindUser(pending.userId) : await this.findOrCreateUserForSwiggy(token.access_token);

    await this.connections.saveConnection(user.id, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      connectedAt: new Date().toISOString(),
    });

    return this.auth.issueTokens(user);
  }

  async getStatus(userId: string): Promise<{ connected: boolean; connectedAt?: string; hasRealData: boolean }> {
    const connection = await this.connections.getConnection(userId);
    if (connection) return { connected: true, connectedAt: connection.connectedAt, hasRealData: true };
    const fallbackUserId = this.config.defaultOwnerUserId;
    const hasRealData = fallbackUserId && fallbackUserId !== userId ? Boolean(await this.getValidAccessToken(fallbackUserId)) : false;
    return { connected: false, hasRealData };
  }

  async disconnect(userId: string): Promise<void> {
    await this.connections.deleteConnection(userId);
  }

  async getValidAccessToken(userId: string): Promise<string | null> {
    const connection = await this.connections.getConnection(userId);
    if (!connection) return null;
    if (Date.now() < connection.expiresAt - 30_000) return connection.accessToken;
    if (!connection.refreshToken) {
      await this.connections.deleteConnection(userId);
      return null;
    }

    let token: SwiggyTokenResponse;
    try {
      token = await this.exchangeToken({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
        client_id: this.config.clientId,
        resource: this.config.mcpUrl,
      });
    } catch {
      await this.connections.deleteConnection(userId);
      return null;
    }

    const refreshed: OAuthConnection = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? connection.refreshToken,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      connectedAt: connection.connectedAt,
    };
    await this.connections.saveConnection(userId, refreshed);
    return refreshed.accessToken;
  }

  /** Same fallback rule as `ZeptoOAuthService.getValidAccessTokenWithFallback` — see its doc
   * comment. Returns which userId's connection actually got used so callers can cache
   * real-Swiggy lookups per connection owner, not per requester. */
  async getValidAccessTokenWithFallback(userId: string | null): Promise<{ ownerUserId: string; accessToken: string } | null> {
    if (userId) {
      const own = await this.getValidAccessToken(userId);
      if (own) return { ownerUserId: userId, accessToken: own };
    }
    const fallbackUserId = this.config.defaultOwnerUserId;
    if (!fallbackUserId || fallbackUserId === userId) return null;
    const fallback = await this.getValidAccessToken(fallbackUserId);
    return fallback ? { ownerUserId: fallbackUserId, accessToken: fallback } : null;
  }

  get mcpUrl(): string {
    return this.config.mcpUrl;
  }

  private async exchangeToken(params: Record<string, string>): Promise<SwiggyTokenResponse> {
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    if (!res.ok) {
      throw new BadRequestException({ error: "swiggy_token_exchange_failed", status: res.status, body: await res.text() });
    }
    return (await res.json()) as SwiggyTokenResponse;
  }

  private async findOrCreateUserForSwiggy(accessToken: string): Promise<User> {
    const subject = decodeJwtSubject(accessToken);
    const phone = subject ? `swiggy:${subject}` : `swiggy:${crypto.randomUUID()}`;
    const existing = await this.users.findByPhone(phone);
    if (existing) return existing;
    return this.users.create({ phone, name: "Swiggy shopper", defaultPincode: "560001" });
  }

  private async mustFindUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException({ error: "user_not_found" });
    return user;
  }
}
