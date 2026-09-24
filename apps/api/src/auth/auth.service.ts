import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { AuthStatePort, UserRepositoryPort } from "@quickcart/domain";
import type { AuthTokens, JwtClaims, RequestOtpInput, User, VerifyOtpInput } from "@quickcart/contracts";
import { AUTH_STATE, JWT_PORT, USER_REPOSITORY } from "./auth.tokens.js";
import type { JwtPort } from "./jwt-port.js";

const OTP_TTL_MS = 5 * 60_000;
const REFRESH_TTL_MS = 30 * 24 * 3_600_000;
/** Ideation-scope mock: a fixed OTP, logged to the console instead of sent by SMS (Doc 03's
 * OTP → JWT handshake, minus the actual SMS provider — see README "simplifications"). */
const FIXED_DEV_OTP = "1234";

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    @Inject(JWT_PORT) private readonly jwt: JwtPort,
    @Inject(AUTH_STATE) private readonly authState: AuthStatePort,
  ) {}

  async requestOtp(input: RequestOtpInput): Promise<{ sent: true; devOtp: string }> {
    await this.authState.setOtp(input.phone, { otp: FIXED_DEV_OTP, expiresAt: Date.now() + OTP_TTL_MS });
    console.log(`[auth] OTP for ${input.phone}: ${FIXED_DEV_OTP} (mock — no SMS provider in this ideation build)`);
    // devOtp is only ever returned so the demo UI can autofill it; a real build would never do this.
    return { sent: true, devOtp: FIXED_DEV_OTP };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthTokens> {
    const record = await this.authState.getOtp(input.phone);
    if (!record || record.otp !== input.otp || Date.now() > record.expiresAt) {
      throw new UnauthorizedException({ error: "invalid_otp" });
    }
    await this.authState.deleteOtp(input.phone);

    const user = (await this.users.findByPhone(input.phone)) ?? (await this.users.create({
      phone: input.phone,
      name: `Shopper ${input.phone.slice(-4)}`,
      defaultPincode: input.pincode,
    }));

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const record = await this.authState.getRefreshToken(refreshToken);
    if (!record || Date.now() > record.expiresAt) throw new UnauthorizedException({ error: "invalid_refresh_token" });
    await this.authState.deleteRefreshToken(refreshToken); // one-time use — rotated on every refresh

    const user = await this.users.findById(record.userId);
    if (!user) throw new UnauthorizedException({ error: "user_not_found" });
    return this.issueTokens(user);
  }

  /** Public on purpose: `ZeptoOAuthService` mints a real QuickCart session the same way OTP
   * verification does once a real Zepto connection resolves to a QuickCart user — one login
   * mechanism, two ways to reach it. */
  async issueTokens(user: User): Promise<AuthTokens> {
    const claims: JwtClaims = { sub: user.id, phone: user.phone, name: user.name, deliveryZone: user.defaultPincode };
    const accessToken = await this.jwt.sign(claims, { expiresIn: "15m" });
    const refreshToken = crypto.randomUUID();
    await this.authState.setRefreshToken(refreshToken, { userId: user.id, expiresAt: Date.now() + REFRESH_TTL_MS });
    return { accessToken, refreshToken, user };
  }
}
