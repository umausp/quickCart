import { Inject, Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { JwtClaims } from "@quickcart/contracts";
import { JWT_PORT } from "./auth.tokens.js";
import type { JwtPort } from "./jwt-port.js";

export type AuthedRequest = Request & { user: JwtClaims };

/** Validates the JWT at the gateway before any fan-out happens (Doc 03 §"Connection & auth
 * handshake" — `services/gateway/middleware/authGuard.ts`), attaching claims to the request. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JWT_PORT) private readonly jwt: JwtPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { user?: JwtClaims }>();
    const header = req.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException({ error: "missing_token" });
    try {
      req.user = await this.jwt.verify<JwtClaims>(token);
      return true;
    } catch {
      throw new UnauthorizedException({ error: "invalid_token" });
    }
  }
}
