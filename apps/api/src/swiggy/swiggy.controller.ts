import { BadRequestException, Body, Controller, Delete, Get, Headers, Inject, Post, UseGuards } from "@nestjs/common";
import type { JwtClaims } from "@quickcart/contracts";
import { JWT_PORT } from "../auth/auth.tokens.js";
import { JwtAuthGuard } from "../auth/jwt-auth.guard.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import type { JwtPort } from "../auth/jwt-port.js";
import { SwiggyOAuthService } from "./swiggy-oauth.service.js";

/** Mirrors `zepto.controller.ts` exactly — see its doc comment for why `start` has no guard. */
@Controller("connections/swiggy")
export class SwiggyController {
  constructor(
    private readonly swiggy: SwiggyOAuthService,
    @Inject(JWT_PORT) private readonly jwt: JwtPort,
  ) {}

  @Post("start")
  async start(@Headers("authorization") authHeader?: string) {
    return this.swiggy.beginConnect(await this.optionalUserId(authHeader));
  }

  @Post("complete")
  async complete(@Body() body: { code?: string; state?: string }) {
    if (!body.code || !body.state) throw new BadRequestException({ error: "missing_code_or_state" });
    return this.swiggy.completeConnect(body.code, body.state);
  }

  @UseGuards(JwtAuthGuard)
  @Get("status")
  status(@CurrentUser() user: JwtClaims) {
    return this.swiggy.getStatus(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async disconnect(@CurrentUser() user: JwtClaims) {
    await this.swiggy.disconnect(user.sub);
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
