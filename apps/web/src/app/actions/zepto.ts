"use server";

import { redirect } from "next/navigation";
import type { AuthTokens } from "@quickcart/contracts";
import { apiAction, apiPublic } from "../../lib/api";
import { getSession, setSession } from "../../lib/session";

/**
 * Real OAuth 2.1 + PKCE against Zepto's live server (see apps/api/src/zepto/) — not a mock.
 * The one non-standard step: Zepto only whitelists loopback/native-app redirect URIs, and
 * QuickCart is a hosted web app with no localhost callback to receive them on, so the
 * shopper's browser ends up on a "can't connect to localhost" page with the real
 * authorization code sitting in the URL. `getZeptoAuthorizeUrlAction` returns that URL (rather
 * than redirecting) so the caller can open it in a new tab and keep the *original* tab on the
 * paste-back form the whole time — see `ZeptoConnectFlow`, which is the actual UI for this.
 */
export async function getZeptoAuthorizeUrlAction(): Promise<{ authorizeUrl: string }> {
  const session = await getSession();
  const path = "/connections/zepto/start";
  return session
    ? apiAction<{ authorizeUrl: string }>(path, { method: "POST" })
    : apiPublic<{ authorizeUrl: string }>(path, { method: "POST" });
}

export interface ZeptoConnectState {
  error: string | null;
}

function parseZeptoCallback(pasted: string): { code: string | null; state: string | null } {
  const trimmed = pasted.trim();
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `http://localhost/callback?${trimmed.replace(/^\?/, "")}`);
    return { code: url.searchParams.get("code"), state: url.searchParams.get("state") };
  } catch {
    return { code: null, state: null };
  }
}

export async function completeZeptoConnectAction(_prev: ZeptoConnectState, formData: FormData): Promise<ZeptoConnectState> {
  const pasted = String(formData.get("redirectUrl") ?? "");
  const { code, state } = parseZeptoCallback(pasted);
  if (!code || !state) {
    return { error: "That doesn't look right — paste the full URL from the tab that failed to load (it should contain code= and state=)." };
  }

  try {
    const tokens = await apiPublic<AuthTokens>("/connections/zepto/complete", {
      method: "POST",
      body: JSON.stringify({ code, state }),
    });
    await setSession(tokens);
  } catch {
    return { error: "Could not complete the connection — the code may have expired. Try connecting again." };
  }
  redirect("/home");
}

export async function disconnectZeptoAction(): Promise<void> {
  await apiAction("/connections/zepto", { method: "DELETE" });
  redirect("/profile");
}
