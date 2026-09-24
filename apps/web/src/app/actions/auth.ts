"use server";

import { redirect } from "next/navigation";
import { RequestOtpSchema, VerifyOtpSchema, type AuthTokens } from "@quickcart/contracts";
import { apiPublic } from "../../lib/api";
import { clearSession, setSession } from "../../lib/session";

export interface OtpRequestState {
  error: string | null;
  devOtp: string | null;
  phone: string;
}

export async function requestOtpAction(_prev: OtpRequestState, formData: FormData): Promise<OtpRequestState> {
  const phone = String(formData.get("phone") ?? "");
  const parsed = RequestOtpSchema.safeParse({ phone });
  if (!parsed.success) return { error: "Enter a valid 10-digit phone number.", devOtp: null, phone };

  try {
    const result = await apiPublic<{ sent: true; devOtp: string }>("/auth/otp", {
      method: "POST",
      body: JSON.stringify(parsed.data),
    });
    // devOtp is only ever surfaced because this is a mock — see AuthService's own comment.
    return { error: null, devOtp: result.devOtp, phone };
  } catch {
    return { error: "Could not send the code. Try again.", devOtp: null, phone };
  }
}

export interface OtpVerifyState {
  error: string | null;
  phone: string;
}

export async function verifyOtpAction(_prev: OtpVerifyState, formData: FormData): Promise<OtpVerifyState> {
  const phone = String(formData.get("phone") ?? "");
  const otp = String(formData.get("otp") ?? "");
  const parsed = VerifyOtpSchema.safeParse({ phone, otp });
  if (!parsed.success) return { error: "Enter the 4-digit code.", phone };

  try {
    const tokens = await apiPublic<AuthTokens>("/auth/verify", { method: "POST", body: JSON.stringify(parsed.data) });
    await setSession(tokens);
  } catch {
    return { error: "Incorrect code. Try again.", phone };
  }
  redirect("/home");
}

export async function logoutAction(): Promise<void> {
  await clearSession();
  redirect("/login");
}
