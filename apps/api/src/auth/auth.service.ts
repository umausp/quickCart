import { randomUUID } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { UserRepositoryPort } from "@quickcart/domain";
import type { AuthTokens, JwtClaims, RequestOtpInput, User, VerifyOtpInput } from "@quickcart/contracts";
import { USER_REPOSITORY } from "./auth.tokens.js";

const OTP_TTL_MS = 5 * 60_000;
const REFRESH_TTL_MS = 30 * 24 * 3_600_000;
/** Ideation-scope mock: a fixed OTP, logged to the console instead of sent by SMS (Doc 03's
 * OTP → JWT handshake, minus the actual SMS provider — see README "simplifications"). */
const FIXED_DEV_OTP = "1234";

interface RefreshRecord {
  userId: string;
  expiresAt: number;
}

@Injectable()
export class AuthService {
  private readonly otps = new Map<string, { otp: string; expiresAt: number }>();
  private readonly refreshTokens = new Map<string, RefreshRecord>();

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepositoryPort,
    private readonly jwt: JwtService,
  ) {}

  requestOtp(input: RequestOtpInput): { sent: true; devOtp: string } {
    this.otps.set(input.phone, { otp: FIXED_DEV_OTP, expiresAt: Date.now() + OTP_TTL_MS });
    console.log(`[auth] OTP for ${input.phone}: ${FIXED_DEV_OTP} (mock — no SMS provider in this ideation build)`);
    // devOtp is only ever returned so the demo UI can autofill it; a real build would never do this.
    return { sent: true, devOtp: FIXED_DEV_OTP };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthTokens> {
    const record = this.otps.get(input.phone);
    if (!record || record.otp !== input.otp || Date.now() > record.expiresAt) {
      throw new UnauthorizedException({ error: "invalid_otp" });
    }
    this.otps.delete(input.phone);

    const user = (await this.users.findByPhone(input.phone)) ?? (await this.users.create({
      phone: input.phone,
      name: `Shopper ${input.phone.slice(-4)}`,
      defaultPincode: input.pincode,
    }));

    return this.issueTokens(user);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const record = this.refreshTokens.get(refreshToken);
    if (!record || Date.now() > record.expiresAt) throw new UnauthorizedException({ error: "invalid_refresh_token" });
    this.refreshTokens.delete(refreshToken); // one-time use — rotated on every refresh

    const user = await this.users.findById(record.userId);
    if (!user) throw new UnauthorizedException({ error: "user_not_found" });
    return this.issueTokens(user);
  }

  private issueTokens(user: User): AuthTokens {
    const claims: JwtClaims = { sub: user.id, phone: user.phone, name: user.name, deliveryZone: user.defaultPincode };
    const accessToken = this.jwt.sign(claims, { expiresIn: "15m" });
    const refreshToken = randomUUID();
    this.refreshTokens.set(refreshToken, { userId: user.id, expiresAt: Date.now() + REFRESH_TTL_MS });
    return { accessToken, refreshToken, user };
  }
}
