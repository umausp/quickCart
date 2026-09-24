import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { AuthTokens } from "@quickcart/contracts";
import { API_BASE_URL } from "./config";
import { clearSession, getSession, setSession, type Session } from "./session";

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** The minimal shape of a Cloudflare Service Binding this file uses — declared locally
 * (not `@cloudflare/workers-types`) so `apps/web` stays free of a Workers-only dependency,
 * same reasoning as `KVNamespaceLike` in `packages/domain/src/kv-repositories.ts`. */
interface FetcherLike {
  fetch: FetchLike;
}

/**
 * On the Cloudflare deployment, `quickcart-web` and `quickcart-api` are both Workers on the
 * same `*.workers.dev` zone — Cloudflare rejects a Worker `fetch()`-ing another Worker's
 * public URL directly with error 1042 (same-zone loop prevention; the exact issue
 * `apps/api/src/worker.ts` hit calling the retailer MCP Workers, see
 * CLOUDFLARE-MIGRATION-PLAN.md). The fix is the same: a Service Binding
 * (`API_SERVICE` in `wrangler.jsonc`) whose `.fetch` bypasses the public internet entirely.
 * `getCloudflareContext` throws outside a Workers runtime (plain `next dev`/`next start`),
 * so this falls back to the global `fetch` there — both deployments keep working unchanged.
 */
async function resolveFetch(): Promise<FetchLike> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const service = (env as { API_SERVICE?: FetcherLike }).API_SERVICE;
    if (service) return service.fetch.bind(service);
  } catch {
    // Not running on Workers — plain `next dev`/`next start` talks to the API over the network.
  }
  return fetch;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`API error ${status}: ${JSON.stringify(body)}`);
  }
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function rawFetch(path: string, init: RequestInit & { accessToken?: string } = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.accessToken) headers.set("Authorization", `Bearer ${init.accessToken}`);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const fetchImpl = await resolveFetch();
  return fetchImpl(`${API_BASE_URL}${path}`, { ...init, headers, cache: "no-store" });
}

async function toResult<T>(res: Response): Promise<T> {
  if (!res.ok) throw new ApiError(res.status, await safeJson(res));
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Unauthenticated call — search, product offers (Doc 03: these are the routes with no auth guard). */
export async function apiPublic<T>(path: string, init: RequestInit = {}): Promise<T> {
  return toResult<T>(await rawFetch(path, init));
}

/**
 * Authenticated **read** — for use in Server Components rendering a page. Deliberately does
 * *not* attempt a token refresh: Next.js forbids mutating cookies outside a Server
 * Action/Route Handler, so a page render can't safely rewrite the session cookie. An expired
 * token here just surfaces as a 401 and the page redirects to `/login` — see `apiAction` for
 * the mutation-side counterpart that *can* refresh.
 */
export async function apiRead<T>(path: string, init: RequestInit = {}): Promise<{ data: T; session: Session } | { data: null; session: null }> {
  const session = await getSession();
  if (!session) return { data: null, session: null };
  const res = await rawFetch(path, { ...init, accessToken: session.accessToken });
  if (res.status === 401) return { data: null, session: null };
  return { data: await toResult<T>(res), session };
}

/**
 * Authenticated **write** — for use inside Server Actions, where rewriting the session
 * cookie is allowed. Retries once through `/auth/refresh` on a 401 before giving up.
 */
export async function apiAction<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await getSession();
  if (!session) throw new ApiError(401, { error: "no_session" });

  let res = await rawFetch(path, { ...init, accessToken: session.accessToken });
  if (res.status === 401) {
    const refreshRes = await rawFetch("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: session.refreshToken }) });
    if (!refreshRes.ok) {
      await clearSession();
      throw new ApiError(401, { error: "session_expired" });
    }
    const refreshed = (await refreshRes.json()) as AuthTokens;
    await setSession(refreshed);
    res = await rawFetch(path, { ...init, accessToken: refreshed.accessToken });
  }
  return toResult<T>(res);
}
