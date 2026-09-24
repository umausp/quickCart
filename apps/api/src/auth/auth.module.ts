import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { InMemoryUserRepository } from "@quickcart/domain";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { USER_REPOSITORY } from "./auth.tokens.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

/** HS256 with a shared secret, not the RS256 keypair Doc 03 sketches — a deliberate
 * ideation-scope simplification (see README); swapping to RS256 only touches this module. */
const JWT_SECRET = process.env.JWT_SECRET ?? "quickcart-dev-secret-do-not-use-in-production";

@Module({
  imports: [JwtModule.register({ secret: JWT_SECRET, signOptions: { algorithm: "HS256" } })],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, { provide: USER_REPOSITORY, useClass: InMemoryUserRepository }],
  exports: [AuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}
