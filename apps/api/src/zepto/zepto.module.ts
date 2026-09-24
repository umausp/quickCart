import { Module } from "@nestjs/common";
import { InMemoryZeptoConnectionRepository } from "@quickcart/domain";
import { AuthModule } from "../auth/auth.module.js";
import { loadZeptoConfig } from "./zepto.config.js";
import { ZEPTO_CONFIG, ZEPTO_CONNECTION } from "./zepto.tokens.js";
import { ZeptoController } from "./zepto.controller.js";
import { ZeptoOAuthService } from "./zepto-oauth.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ZeptoController],
  providers: [
    ZeptoOAuthService,
    { provide: ZEPTO_CONNECTION, useClass: InMemoryZeptoConnectionRepository },
    { provide: ZEPTO_CONFIG, useValue: loadZeptoConfig(process.env as Record<string, string | undefined>) },
  ],
  exports: [ZeptoOAuthService],
})
export class ZeptoModule {}
