import { Module } from "@nestjs/common";
import { InMemoryAddressRepository } from "@quickcart/domain";
import { AuthModule } from "../auth/auth.module.js";
import { AddressesController } from "./addresses.controller.js";
import { AddressesService } from "./addresses.service.js";
import { ADDRESS_REPOSITORY } from "./addresses.tokens.js";

@Module({
  imports: [AuthModule],
  controllers: [AddressesController],
  providers: [AddressesService, { provide: ADDRESS_REPOSITORY, useClass: InMemoryAddressRepository }],
  exports: [AddressesService],
})
export class AddressesModule {}
