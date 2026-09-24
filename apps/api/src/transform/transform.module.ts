import { Module } from "@nestjs/common";
import { TransformService } from "./transform.service.js";

@Module({
  providers: [TransformService],
  exports: [TransformService],
})
export class TransformModule {}
