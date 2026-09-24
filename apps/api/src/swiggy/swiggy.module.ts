import { Module } from "@nestjs/common";
import { InMemoryOAuthConnectionRepository } from "@quickcart/domain";
import { AuthModule } from "../auth/auth.module.js";
import { loadSwiggyConfig } from "./swiggy.config.js";
import { SWIGGY_CONFIG, SWIGGY_CONNECTION } from "./swiggy.tokens.js";
import { SwiggyController } from "./swiggy.controller.js";
import { SwiggyOAuthService } from "./swiggy-oauth.service.js";

@Module({
  imports: [AuthModule],
  controllers: [SwiggyController],
  providers: [
    SwiggyOAuthService,
    { provide: SWIGGY_CONNECTION, useClass: InMemoryOAuthConnectionRepository },
    { provide: SWIGGY_CONFIG, useValue: loadSwiggyConfig(process.env as Record<string, string | undefined>) },
  ],
  exports: [SwiggyOAuthService],
})
export class SwiggyModule {}
