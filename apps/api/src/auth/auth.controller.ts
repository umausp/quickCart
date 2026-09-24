import { Body, Controller, Post } from "@nestjs/common";
import { RequestOtpSchema, VerifyOtpSchema } from "@quickcart/contracts";
import { validate } from "../common/zod-validate.js";
import { AuthService } from "./auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("otp")
  requestOtp(@Body() body: unknown) {
    return this.auth.requestOtp(validate(RequestOtpSchema, body));
  }

  @Post("verify")
  verify(@Body() body: unknown) {
    return this.auth.verifyOtp(validate(VerifyOtpSchema, body));
  }

  @Post("refresh")
  refresh(@Body("refreshToken") refreshToken: string) {
    return this.auth.refresh(refreshToken);
  }
}
