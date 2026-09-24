import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { JwtClaims } from "@quickcart/contracts";
import type { AuthedRequest } from "./jwt-auth.guard.js";

/** `@CurrentUser()` in a controller method signature — the JWT claims `JwtAuthGuard` attached. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtClaims => {
  return ctx.switchToHttp().getRequest<AuthedRequest>().user;
});
