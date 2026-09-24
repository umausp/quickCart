import { Hono } from "hono";
import { HttpException } from "@nestjs/common";
import { AggregationGateway, KvOfferCache, McpSourceClientFactory, type SourceClientFactory } from "@quickcart/aggregation-core";
import type { FetchLike } from "@quickcart/mcp-toolkit/client";
import {
  KvAddressRepository,
  KvAuthStateRepository,
  KvCartRepository,
  KvOrderRepository,
  KvUserRepository,
  KvZeptoConnectionRepository,
  type KVNamespaceLike as DomainKv,
} from "@quickcart/domain";
import {
  AddToCartRequestSchema,
  PlaceOrderRequestSchema,
  RequestOtpSchema,
  UpsertAddressSchema,
  VerifyOtpSchema,
  type JwtClaims,
  type SourceId,
  type SourceProduct,
} from "@quickcart/contracts";
import { buildProductOffersResponse, buildSearchResponse } from "@quickcart/pricing-core";
import { AddressesService } from "./addresses/addresses.service.js";
import { AuthService } from "./auth/auth.service.js";
import { validate } from "./common/zod-validate.js";
import { weightsForMode } from "./gateway/ranking-mode.js";
import { createJoseJwtPort } from "./jwt-jose.js";
import { CartService } from "./cart/cart.service.js";
import { OrderOrchestrator } from "./orders/orchestrator.js";
import { OrdersService } from "./orders/orders.service.js";
import { loadZeptoConfig } from "./zepto/zepto.config.js";
import { ZeptoOAuthService } from "./zepto/zepto-oauth.service.js";
import { getRealZeptoProduct, parseZeptoLiveCanonicalSku, searchRealZepto } from "./zepto/zepto-mcp-adapter.js";

/**
 * The Cloudflare Workers entrypoint for the whole backend — same layered architecture
 * (Gateway → Transform → Aggregation → MCP) and the *exact same* service classes as the
 * NestJS deployment (`src/main.ts`); only the composition mechanism differs. NestJS's
 * `@Injectable()`/`@Inject()` decorators are harmless no-ops when a class is constructed by
 * a plain `new` instead of Nest's container — every service below is used completely
 * unmodified. What's genuinely different: KV-backed repositories/cache instead of in-memory
 * ones, `jose` instead of `jsonwebtoken` for JWT, and Hono instead of Express/Nest for HTTP
 * routing (Workers has no listening `http.Server` for Nest's platform-express to bind to).
 * See CLOUDFLARE-MIGRATION-PLAN.md.
 */

export interface Env {
  API_KV: KVNamespace;
  JWT_SECRET?: string;
  BLINKIT_MCP_URL?: string;
  ZEPTO_MCP_URL?: string;
  BIGBASKET_MCP_URL?: string;
  FLIPKART_MCP_URL?: string;
  AMAZON_MCP_URL?: string;
  // Service Bindings — the *actual* Worker-to-Worker transport (see fetchOverrides below).
  // Cloudflare rejects a Worker `fetch()`-ing another Worker's public `*.workers.dev` URL
  // directly with error 1042 (same-zone loop prevention); Service Bindings are the supported
  // path and route entirely inside Cloudflare's network, bypassing the public internet.
  BLINKIT_SERVICE: Fetcher;
  ZEPTO_SERVICE: Fetcher;
  BIGBASKET_SERVICE: Fetcher;
  FLIPKART_SERVICE: Fetcher;
  AMAZON_SERVICE: Fetcher;
  // Real Zepto OAuth (a genuinely different, per-user-authenticated MCP source — see
  // apps/api/src/zepto/). Every field is optional so the defaults baked into loadZeptoConfig
  // (the real, live-registered DCR client) apply without any wrangler.jsonc vars needed.
  // Prefixed ZEPTO_OAUTH_*, never ZEPTO_MCP_URL, so it can't collide with the *mock* zepto
  // retailer's override above.
  ZEPTO_OAUTH_CLIENT_ID?: string;
  ZEPTO_OAUTH_REDIRECT_URI?: string;
  ZEPTO_OAUTH_AUTHORIZE_URL?: string;
  ZEPTO_OAUTH_TOKEN_URL?: string;
  ZEPTO_OAUTH_MCP_URL?: string;
  ZEPTO_OAUTH_SCOPE?: string;
}

const DEFAULT_LOCATION = { pincode: "560001" };
const DEFAULT_URLS: Record<SourceId, string> = {
  blinkit: "https://quickcart-mcp-blinkit.pathakumashankar.workers.dev/mcp",
  zepto: "https://quickcart-mcp-zepto.pathakumashankar.workers.dev/mcp",
  bigbasket: "https://quickcart-mcp-bigbasket.pathakumashankar.workers.dev/mcp",
  flipkart: "https://quickcart-mcp-flipkart.pathakumashankar.workers.dev/mcp",
  amazon: "https://quickcart-mcp-amazon.pathakumashankar.workers.dev/mcp",
};
/** Same reasoning as the Node deployment's identical helper in `search.controller.ts`: a real
 * Zepto search is a multi-round-trip session against an external server, and the home page
 * alone re-runs the same query on every load — cache it per-user for the same 30s window the
 * shared mock fan-out already uses, via the same cache instance. */
async function cachedSearchRealZepto(
  aggregation: AggregationGateway,
  zepto: { userId: string; accessToken: string },
  query: string,
  limit: number,
): Promise<SourceProduct[]> {
  const cacheKey = `zepto-live-search:${zepto.userId}:${query.toLowerCase()}:${limit}`;
  const cached = await aggregation.cache.get<SourceProduct[]>(cacheKey);
  if (cached) return cached;
  const results = await searchRealZepto(zepto.accessToken, query, limit);
  await aggregation.cache.set(cacheKey, results, 30);
  return results;
}

interface Services {
  aggregation: AggregationGateway;
  auth: AuthService;
  addresses: AddressesService;
  cart: CartService;
  orders: OrdersService;
  jwt: ReturnType<typeof createJoseJwtPort>;
  zepto: ZeptoOAuthService;
}

// Module-scope cache: Workers *may* reuse the same isolate across several requests, saving
// reconstruction cost. Deliberately does *not* also fire `warmCatalogue()` here: an unawaited
// background call racing against the very request that triggered it hit a real bug (see
// CLOUDFLARE-MIGRATION-PLAN.md) — Workers can abort in-flight subrequests once a response is
// sent unless they're wrapped in `ctx.waitUntil()`, and that abort was tearing down
// connections `McpSourceClientFactory` had already cached and handed to the *foreground*
// request, turning every source's fan-out into a failure. Warming is now the explicit
// `GET /warm` route below, whose own request naturally stays alive until it finishes — plus
// `AggregationGateway` opportunistically re-ingests catalogue entries from every search
// result anyway, so the index self-heals even without ever calling `/warm`.
let cachedServices: Services | null = null;

function buildServices(env: Env): Services {
  if (cachedServices) return cachedServices;

  const kv = env.API_KV as unknown as DomainKv;
  const urls: Record<SourceId, string> = {
    blinkit: env.BLINKIT_MCP_URL ?? DEFAULT_URLS.blinkit,
    zepto: env.ZEPTO_MCP_URL ?? DEFAULT_URLS.zepto,
    bigbasket: env.BIGBASKET_MCP_URL ?? DEFAULT_URLS.bigbasket,
    flipkart: env.FLIPKART_MCP_URL ?? DEFAULT_URLS.flipkart,
    amazon: env.AMAZON_MCP_URL ?? DEFAULT_URLS.amazon,
  };
  // Service Bindings' `.fetch` matches `FetchLike` exactly — this is what actually reaches
  // the retailer Workers (see the Env interface comment above for why a plain `fetch(url)`
  // to their public URL doesn't work from inside another Worker).
  const fetchOverrides: Partial<Record<SourceId, FetchLike>> = {
    blinkit: env.BLINKIT_SERVICE.fetch.bind(env.BLINKIT_SERVICE),
    zepto: env.ZEPTO_SERVICE.fetch.bind(env.ZEPTO_SERVICE),
    bigbasket: env.BIGBASKET_SERVICE.fetch.bind(env.BIGBASKET_SERVICE),
    flipkart: env.FLIPKART_SERVICE.fetch.bind(env.FLIPKART_SERVICE),
    amazon: env.AMAZON_SERVICE.fetch.bind(env.AMAZON_SERVICE),
  };
  const clientFactory: SourceClientFactory = new McpSourceClientFactory(urls, "quickcart-api-worker", fetchOverrides);
  const aggregation = new AggregationGateway({ clientFactory, cache: new KvOfferCache(env.API_KV), location: DEFAULT_LOCATION });

  const jwt = createJoseJwtPort(env.JWT_SECRET ?? "quickcart-dev-secret-do-not-use-in-production");
  const users = new KvUserRepository(kv);
  const addressRepo = new KvAddressRepository(kv);
  const cartRepo = new KvCartRepository(kv);
  const orderRepo = new KvOrderRepository(kv);
  const authState = new KvAuthStateRepository(kv);

  const auth = new AuthService(users, jwt, authState);
  const addresses = new AddressesService(addressRepo);

  const zeptoConfig = loadZeptoConfig(env as unknown as Record<string, string | undefined>);
  const zeptoConnections = new KvZeptoConnectionRepository(kv);
  const zepto = new ZeptoOAuthService(zeptoConnections, users, auth, zeptoConfig);

  const cart = new CartService(cartRepo, aggregation, addresses, zepto);
  const orchestrator = new OrderOrchestrator(aggregation);
  const orders = new OrdersService(orderRepo, cart, addresses, orchestrator);

  cachedServices = { aggregation, auth, addresses, cart, orders, jwt, zepto };
  return cachedServices;
}

type AppEnv = { Bindings: Env; Variables: { user: JwtClaims } };
const app = new Hono<AppEnv>();

app.onError((err, c) => {
  if (err instanceof HttpException) {
    const status = err.getStatus();
    return c.json(err.getResponse() as object, status as 400);
  }
  console.error("[worker] unhandled error:", err);
  return c.json({ error: "internal_error" }, 500);
});

async function requireAuth(c: import("hono").Context<AppEnv>, next: () => Promise<void>) {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "missing_token" }, 401);
  try {
    const claims = await buildServices(c.env).jwt.verify<JwtClaims>(token);
    c.set("user", claims);
    await next();
  } catch {
    return c.json({ error: "invalid_token" }, 401);
  }
}

// ---- Gateway: search & product detail (public) --------------------------------------------

// No mock data: this only ever returns real MCP results. A logged-in shopper's real,
// connected Zepto account is the only source right now (Zepto's own server requires auth for
// every call, including plain search); a guest, or anyone not connected, gets an empty result
// set rather than the old shared demo catalogue. Swiggy joins this list once QuickCart has
// real API access to it (blocked on Swiggy's own invite-based application, not this code).
app.get("/v1/search", async (c) => {
  const { aggregation, jwt, zepto } = buildServices(c.env);
  const q = c.req.query("q") ?? "";
  const limit = Number(c.req.query("limit")) || 20;

  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const zeptoSession = token
    ? await jwt
        .verify<JwtClaims>(token)
        .then(async (claims) => {
          const accessToken = await zepto.getValidAccessToken(claims.sub);
          return accessToken ? { userId: claims.sub, accessToken } : null;
        })
        .catch(() => null)
    : null;

  const products: SourceProduct[] = zeptoSession ? await cachedSearchRealZepto(aggregation, zeptoSession, q, limit) : [];
  const sourcesQueried = zeptoSession ? 1 : 0;

  return c.json(buildSearchResponse(q, products, sourcesQueried, weightsForMode(c.req.query("mode"))));
});

// No mock data: a `ZEPTO-LIVE-*` sku (the only kind `/v1/search` can produce now) is refetched
// live from the connected shopper's real Zepto account. There's nothing to compare it against
// yet (one real source), so this is a single-offer response, not a ranked multi-source one.
app.get("/v1/products/:sku/offers", async (c) => {
  const { aggregation, jwt, zepto } = buildServices(c.env);
  const sku = c.req.param("sku");
  const mode = c.req.query("mode");

  const productVariantId = parseZeptoLiveCanonicalSku(sku);
  if (productVariantId) {
    const header = c.req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    const accessToken = token
      ? await jwt
          .verify<JwtClaims>(token)
          .then((claims) => zepto.getValidAccessToken(claims.sub))
          .catch(() => null)
      : null;
    if (!accessToken) return c.json({ error: "unknown_sku", sku }, 404);

    const product = await getRealZeptoProduct(accessToken, productVariantId);
    if (!product) return c.json({ error: "unknown_sku", sku }, 404);

    const meta = { canonicalSku: product.canonicalSku, title: product.title, brand: product.brand, category: product.category, packSize: product.packSize, image: product.image };
    return c.json(buildProductOffersResponse(meta, [product], 1, 1, weightsForMode(mode)));
  }

  const pincode = DEFAULT_LOCATION.pincode;
  let meta = aggregation.getCanonicalMeta(sku);
  // The Node deployment warms the catalogue once at process startup and stays warm forever
  // (a long-lived process); a Worker isolate has no such guarantee — it may be freshly spun
  // up with an empty in-memory `CatalogueIndex` even after another isolate warmed it. Rather
  // than persisting the whole crawl to KV, retry with a live warm-up on a cold miss: cheap
  // (free-tier MCP calls only) and this route is far lower-traffic than `/v1/search`, which
  // already self-heals for free via its own `ingest()` calls.
  if (!meta) {
    await aggregation.warmCatalogue();
    meta = aggregation.getCanonicalMeta(sku);
  }
  if (!meta) return c.json({ error: "unknown_sku", sku }, 404);

  const { results, sourcesQueried, sourcesReturned } = await aggregation.getOffersForSku(sku, { pincode });
  const products = results.map((r) => r.value).filter((v): v is SourceProduct => Boolean(v));
  return c.json(buildProductOffersResponse(meta, products, sourcesQueried, sourcesReturned, weightsForMode(mode)));
});

// ---- Auth (public) --------------------------------------------------------------------------

app.post("/v1/auth/otp", async (c) => {
  const { auth } = buildServices(c.env);
  const input = validate(RequestOtpSchema, await c.req.json());
  return c.json(await auth.requestOtp(input));
});

app.post("/v1/auth/verify", async (c) => {
  const { auth } = buildServices(c.env);
  const input = validate(VerifyOtpSchema, await c.req.json());
  return c.json(await auth.verifyOtp(input));
});

app.post("/v1/auth/refresh", async (c) => {
  const { auth } = buildServices(c.env);
  const { refreshToken } = await c.req.json<{ refreshToken: string }>();
  return c.json(await auth.refresh(refreshToken));
});

// ---- Real Zepto connection (start/complete are auth-optional — see zepto.controller.ts's
// doc comment; the same "Continue with Zepto" flow is both a login and a profile-page link) --

app.post("/v1/connections/zepto/start", async (c) => {
  const { zepto, jwt } = buildServices(c.env);
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  const userId = token
    ? await jwt
        .verify<JwtClaims>(token)
        .then((claims) => claims.sub)
        .catch(() => null)
    : null;
  return c.json(await zepto.beginConnect(userId));
});

app.post("/v1/connections/zepto/complete", async (c) => {
  const { zepto } = buildServices(c.env);
  const body = await c.req.json<{ code?: string; state?: string }>();
  if (!body.code || !body.state) return c.json({ error: "missing_code_or_state" }, 400);
  return c.json(await zepto.completeConnect(body.code, body.state));
});

app.get("/v1/connections/zepto/status", requireAuth, async (c) => {
  const { zepto } = buildServices(c.env);
  return c.json(await zepto.getStatus(c.get("user").sub));
});

app.delete("/v1/connections/zepto", requireAuth, async (c) => {
  const { zepto } = buildServices(c.env);
  await zepto.disconnect(c.get("user").sub);
  return c.json({ disconnected: true });
});

// ---- Addresses (authed) ---------------------------------------------------------------------

app.get("/v1/addresses", requireAuth, async (c) => {
  const { addresses } = buildServices(c.env);
  return c.json(await addresses.list(c.get("user").sub));
});

app.post("/v1/addresses", requireAuth, async (c) => {
  const { addresses } = buildServices(c.env);
  const input = validate(UpsertAddressSchema, await c.req.json());
  return c.json(await addresses.create(c.get("user").sub, input));
});

app.patch("/v1/addresses/:id", requireAuth, async (c) => {
  const { addresses } = buildServices(c.env);
  const input = validate(UpsertAddressSchema, await c.req.json());
  return c.json(await addresses.update(c.get("user").sub, c.req.param("id")!, input));
});

app.delete("/v1/addresses/:id", requireAuth, async (c) => {
  const { addresses } = buildServices(c.env);
  return c.json(await addresses.delete(c.get("user").sub, c.req.param("id")!));
});

app.post("/v1/addresses/:id/default", requireAuth, async (c) => {
  const { addresses } = buildServices(c.env);
  return c.json(await addresses.setDefault(c.get("user").sub, c.req.param("id")!));
});

// ---- Cart (authed) --------------------------------------------------------------------------

app.get("/v1/cart", requireAuth, async (c) => {
  const { cart } = buildServices(c.env);
  return c.json(await cart.getView(c.get("user").sub));
});

app.post("/v1/cart/items", requireAuth, async (c) => {
  const { cart } = buildServices(c.env);
  const input = validate(AddToCartRequestSchema, await c.req.json());
  return c.json(await cart.addItem(c.get("user").sub, input));
});

app.patch("/v1/cart/items/:lineId", requireAuth, async (c) => {
  const { cart } = buildServices(c.env);
  const { qty } = await c.req.json<{ qty: number }>();
  return c.json(await cart.updateQty(c.get("user").sub, c.req.param("lineId")!, qty));
});

app.delete("/v1/cart/items/:lineId", requireAuth, async (c) => {
  const { cart } = buildServices(c.env);
  return c.json(await cart.removeItem(c.get("user").sub, c.req.param("lineId")!));
});

app.delete("/v1/cart", requireAuth, async (c) => {
  const { cart } = buildServices(c.env);
  return c.json(await cart.clear(c.get("user").sub));
});

app.patch("/v1/cart/address", requireAuth, async (c) => {
  const { cart } = buildServices(c.env);
  const { addressId } = await c.req.json<{ addressId: string }>();
  return c.json(await cart.setAddress(c.get("user").sub, addressId));
});

// ---- Orders (authed) ------------------------------------------------------------------------

app.post("/v1/orders", requireAuth, async (c) => {
  const { orders } = buildServices(c.env);
  const idempotencyKey = c.req.header("idempotency-key");
  if (!idempotencyKey) return c.json({ error: "missing_idempotency_key" }, 400);
  const { addressId } = validate(PlaceOrderRequestSchema, await c.req.json());
  return c.json(await orders.placeOrder(c.get("user").sub, addressId, idempotencyKey));
});

app.get("/v1/orders", requireAuth, async (c) => {
  const { orders } = buildServices(c.env);
  return c.json(await orders.list(c.get("user").sub));
});

app.get("/v1/orders/:id", requireAuth, async (c) => {
  const { orders } = buildServices(c.env);
  return c.json(await orders.get(c.get("user").sub, c.req.param("id")!));
});

app.get("/health", (c) => c.json({ status: "ok", service: "quickcart-api" }));

/** Explicit catalogue warm-up (Doc 03's catalogue crawl) — a real request, so it naturally
 * stays alive until `warmCatalogue()` finishes, unlike a fire-and-forget background call
 * (see the note by `cachedServices` above for why that mattered). Safe to call any time;
 * cheap to skip — the index also self-heals from ordinary search traffic. */
app.get("/warm", async (c) => {
  const { aggregation } = buildServices(c.env);
  await aggregation.warmCatalogue();
  return c.json(aggregation.catalogueStats);
});

export default app;
