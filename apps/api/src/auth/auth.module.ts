import { Module } from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { InMemoryAuthStateRepository, InMemoryUserRepository } from "@quickcart/domain";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { AUTH_STATE, JWT_PORT, USER_REPOSITORY } from "./auth.tokens.js";
import type { JwtPort } from "./jwt-port.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

/** HS256 with a shared secret, not the RS256 keypair Doc 03 sketches — a deliberate
 * ideation-scope simplification (see README); swapping to RS256 only touches this module. */
const JWT_SECRET = process.env.JWT_SECRET ?? "quickcart-dev-secret-do-not-use-in-production";

@Module({
  imports: [JwtModule.register({ secret: JWT_SECRET, signOptions: { algorithm: "HS256" } })],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    { provide: USER_REPOSITORY, useClass: InMemoryUserRepository },
    { provide: AUTH_STATE, useClass: InMemoryAuthStateRepository },
    {
      // `JwtService`'s sign/verify are synchronous; `JwtPort` is async (the Workers
      // deployment's `jose`-based binding is inherently so) — this is the trivial adapter
      // that lets AuthService/JwtAuthGuard stay identical across both deployments.
      provide: JWT_PORT,
      useFactory: (jwt: JwtService): JwtPort => ({
        async sign(payload, options) {
          return jwt.sign(payload, options as Parameters<JwtService["sign"]>[1]);
        },
        async verify<T>(token: string): Promise<T> {
          return jwt.verify(token) as T;
        },
      }),
      inject: [JwtService],
    },
  ],
  exports: [AuthService, JwtAuthGuard, JwtModule, JWT_PORT],
})
export class AuthModule {}
