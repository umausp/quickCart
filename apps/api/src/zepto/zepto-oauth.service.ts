import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import type { UserRepositoryPort, ZeptoConnection, ZeptoConnectionPort } from "@quickcart/domain";
import type { AuthTokens, User } from "@quickcart/contracts";
import { USER_REPOSITORY } from "../auth/auth.tokens.js";
import { AuthService } from "../auth/auth.service.js";
import type { ZeptoOAuthConfig } from "./zepto.config.js";
import { ZEPTO_CONFIG, ZEPTO_CONNECTION } from "./zepto.tokens.js";
import { codeChallengeFor, decodeJwtSubject, randomCodeVerifier, randomState } from "./pkce.js";

const STATE_TTL_SECONDS = 600;

interface ZeptoTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

/**
 * Drives the real OAuth 2.1 + PKCE handshake against `auth.zepto.co.in` and stores the
 * resulting connection. "Continue with Zepto" doubles as a QuickCart login method: if
 * `beginConnect` wasn't given an existing QuickCart user, `completeConnect` finds-or-creates
 * one and mints a normal QuickCart session the same way OTP verification does — see
 * `AuthService.issueTokens`.
 */
@Injectable()
export class ZeptoOAuthService {
  constructor(
    @Inject(ZEPTO_CONNECTION) private readonly connections: ZeptoConnectionPort,
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly auth: AuthService,
    @Inject(ZEPTO_CONFIG) private readonly config: ZeptoOAuthConfig,
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
    });

    const user = pending.userId ? await this.mustFindUser(pending.userId) : await this.findOrCreateUserForZepto(token.access_token);

    await this.connections.saveConnection(user.id, {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? null,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      connectedAt: new Date().toISOString(),
    });

    return this.auth.issueTokens(user);
  }

  async getStatus(userId: string): Promise<{ connected: boolean; connectedAt?: string }> {
    const connection = await this.connections.getConnection(userId);
    return connection ? { connected: true, connectedAt: connection.connectedAt } : { connected: false };
  }

  async disconnect(userId: string): Promise<void> {
    await this.connections.deleteConnection(userId);
  }

  /** Returns a live access token for this user's real Zepto account, refreshing it first if
   * it's expired (or about to). Returns `null` if there's no connection, or the refresh
   * itself fails (in which case the stale connection is dropped so the UI can prompt a
   * reconnect instead of silently failing every real MCP call). */
  async getValidAccessToken(userId: string): Promise<string | null> {
    const connection = await this.connections.getConnection(userId);
    if (!connection) return null;
    if (Date.now() < connection.expiresAt - 30_000) return connection.accessToken;
    if (!connection.refreshToken) {
      await this.connections.deleteConnection(userId);
      return null;
    }

    let token: ZeptoTokenResponse;
    try {
      token = await this.exchangeToken({
        grant_type: "refresh_token",
        refresh_token: connection.refreshToken,
        client_id: this.config.clientId,
      });
    } catch {
      await this.connections.deleteConnection(userId);
      return null;
    }

    const refreshed: ZeptoConnection = {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? connection.refreshToken,
      expiresAt: Date.now() + (token.expires_in ?? 3600) * 1000,
      connectedAt: connection.connectedAt,
    };
    await this.connections.saveConnection(userId, refreshed);
    return refreshed.accessToken;
  }

  get mcpUrl(): string {
    return this.config.mcpUrl;
  }

  private async exchangeToken(params: Record<string, string>): Promise<ZeptoTokenResponse> {
    const res = await fetch(this.config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
    if (!res.ok) {
      throw new BadRequestException({ error: "zepto_token_exchange_failed", status: res.status, body: await res.text() });
    }
    return (await res.json()) as ZeptoTokenResponse;
  }

  private async findOrCreateUserForZepto(accessToken: string): Promise<User> {
    const subject = decodeJwtSubject(accessToken);
    // `phone` doubles as the Zepto-account linking key here — there's no real phone number at
    // this layer, and reusing the existing `findByPhone` lookup avoids a second identity index.
    const phone = subject ? `zepto:${subject}` : `zepto:${crypto.randomUUID()}`;
    const existing = await this.users.findByPhone(phone);
    if (existing) return existing;
    return this.users.create({ phone, name: "Zepto shopper", defaultPincode: "560001" });
  }

  private async mustFindUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new BadRequestException({ error: "user_not_found" });
    return user;
  }
}
