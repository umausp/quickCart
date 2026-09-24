import { BadRequestException, Body, Controller, Delete, Get, Headers, Inject, Post, UseGuards } from "@nestjs/common";
import type { JwtClaims } from "@quickcart/contracts";
import { JWT_PORT } from "../auth/auth.tokens.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { JwtPort } from "../auth/jwt-port.js";
import { ZeptoOAuthService } from "./zepto-oauth.service.js";

/**
 * `start` is deliberately guard-free: it must work both for an already-logged-in shopper
 * linking Zepto from their profile, and for "Continue with Zepto" *as* the login on a fresh
 * visit, where there's no session yet to guard against. It reads the Authorization header if
 * one happens to be present (linking case) but never requires it (login case).
 */
@Controller("connections/zepto")
export class ZeptoController {
  constructor(
    private readonly zepto: ZeptoOAuthService,
    @Inject(JWT_PORT) private readonly jwt: JwtPort,
  ) {}

  @Post("start")
  async start(@Headers("authorization") authHeader?: string) {
    return this.zepto.beginConnect(await this.optionalUserId(authHeader));
  }

  @Post("complete")
  async complete(@Body() body: { code?: string; state?: string }) {
    if (!body.code || !body.state) throw new BadRequestException({ error: "missing_code_or_state" });
    return this.zepto.completeConnect(body.code, body.state);
  }

  @UseGuards(JwtAuthGuard)
  @Get("status")
  status(@CurrentUser() user: JwtClaims) {
    return this.zepto.getStatus(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async disconnect(@CurrentUser() user: JwtClaims) {
    await this.zepto.disconnect(user.sub);
    return { disconnected: true };
  }

  private async optionalUserId(authHeader?: string): Promise<string | null> {
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
      const claims = await this.jwt.verify<JwtClaims>(token);
      return claims.sub;
    } catch {
      return null;
    }
  }
}
