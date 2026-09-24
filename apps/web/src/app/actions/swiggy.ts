"use server";

import { redirect } from "next/navigation";
import type { AuthTokens } from "@quickcart/contracts";
import { apiAction, apiPublic } from "../../lib/api";
import { getSession, setSession } from "../../lib/session";

/**
 * Real OAuth 2.1 + PKCE against Swiggy's live server (see apps/api/src/swiggy/) — genuinely
 * simpler than the Zepto equivalent (`actions/zepto.ts`): Swiggy's Dynamic Client Registration
 * accepted our own real hosted domain as a redirect_uri (confirmed live), so there's no manual
 * paste-back step — `/connect/swiggy/callback` receives `?code&state` directly and completes
 * the exchange itself.
 */
export async function startSwiggyConnectAction(): Promise<void> {
  const session = await getSession();
  const path = "/connections/swiggy/start";
  const { authorizeUrl } = session
    ? await apiAction<{ authorizeUrl: string }>(path, { method: "POST" })
    : await apiPublic<{ authorizeUrl: string }>(path, { method: "POST" });
  redirect(authorizeUrl);
}

export async function completeSwiggyConnectAction(code: string, state: string): Promise<void> {
  const tokens = await apiPublic<AuthTokens>("/connections/swiggy/complete", {
    method: "POST",
    body: JSON.stringify({ code, state }),
  });
  await setSession(tokens);
}

export async function disconnectSwiggyAction(): Promise<void> {
  await apiAction("/connections/swiggy", { method: "DELETE" });
  redirect("/profile");
}
