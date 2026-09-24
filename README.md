# QuickCart

A meta-marketplace: one search across five retailers (Blinkit, Zepto, BigBasket, Flipkart,
Amazon), best price/stock/ETA ranked automatically, one cart that segregates lines by
company, one checkout that places a real order with every company involved. Built as an
**ideation-phase** reference implementation — see [`QUICKCART-WEB-PLAN.md`](../QUICKCART-WEB-PLAN.md)
for the phase-by-phase build log this repo was built against, and `quickcart-docs/` for the
product/architecture dossier it implements.

The one thing that is **not** cut down for ideation: the MCP layer. `search`, product
detail, `cart`, and `checkout` all run over real MCP (JSON-RPC 2.0 via
`@modelcontextprotocol/sdk`) against five real, independently-running MCP servers.

## Architecture

```
apps/web (Next.js, SSR)  →  apps/api (NestJS)  →  5× services/mcp-<company> (real MCP servers)
                              ├─ Gateway/Auth/Cart/Addresses/Orders  (bff)
                              ├─ Transform   → packages/pricing-core   (rank, shape UI JSON)
                              └─ Aggregation → packages/aggregation-core (fan-out, cache, breaker)
```

Four layers, one direction only (enforced by `pnpm lint:boundaries`, see
`packages/config/eslint-boundaries.cjs`): **ui → bff → transform → aggregation → mcp**, with
`packages/contracts` (shared Zod schemas) and `packages/domain` (repository ports + pure cart
logic) importable by everyone below them.

| Layer | Package(s) | Job |
|---|---|---|
| UI | `apps/web`, `packages/ui` | Next.js App Router, SSR, MUI. Presentation only. |
| BFF/Gateway | `apps/api/src/{gateway,auth,cart,addresses,orders}` | Public API, auth, request composition. |
| Transform | `packages/pricing-core` | Normalize → paise, rank offers, shape UI-valid JSON. |
| Aggregation | `packages/aggregation-core` | **Only** thing that talks to MCP: fan-out, cache, circuit breaker, catalogue index. |
| MCP | `services/mcp-*`, `packages/{mcp-toolkit,retailer-mcp-kit}` | 5 real MCP servers, unified 11-tool contract. |

## Running it

Requires Node ≥20 and pnpm.

```bash
pnpm install
pnpm build            # compiles every package/service once (libs are consumed as built dist)

# 3 terminals (or use `pnpm dev` which runs everything via turbo in parallel):
pnpm dev:mcp          # boots all 5 MCP servers on :7001-:7005
pnpm dev:api          # NestJS API on :8080 (waits for MCP servers)
pnpm dev:web          # Next.js on :3000
```

Open `http://localhost:3000` → redirects to `/login`. It's a mock OTP flow: request a code,
the dev code (`1234`, always) is shown right in the response — no real SMS provider is wired
up. From there: search → product detail → add to cart from multiple companies → cart (tabbed
by company) → add an address → checkout → order history/detail.

Try killing one MCP server mid-session (`kill $(lsof -ti:7004)` for Flipkart) — search keeps
working and reports "N of 5 sources"; checkout still completes for the sources that are up.

### Demo scripts (real MCP calls, no HTTP layer)

```bash
pnpm mcp:demo "butter"                              # fan out search_products to all 5 servers
pnpm mcp:checkout-demo blinkit blk_amul_butter_500g  # create_cart → add_to_cart → checkout
pnpm agg:demo "butter"                               # the above, piped through ranking
```

## Ideation-scope simplifications

Deliberate cuts, not oversights — each is called out in the code comment nearest where it
matters:

- **The 5 MCP servers are real MCP, mock retailers.** Real JSON-RPC 2.0 over Streamable HTTP,
  real tool schemas, real in-memory order state per server — but seeded catalogue data, not a
  live Blinkit/Zepto/etc. integration (none of these platforms publish a public MCP server as
  of writing — see `quickcart-docs/04-mcp-integrations.html`).
- **No real payments.** `checkout`'s `paymentToken` is a stand-in; "authorise/capture" on the
  `Order` are just numbers, not a PSP integration.
- **No re-sourcing.** If a line fails on its source, the order goes `PARTIALLY_CONFIRMED`
  rather than being automatically re-sourced to an alternate in-stock company (Doc 06 describes
  this; it's out of scope here).
- **In-memory persistence.** Users/carts/addresses/orders live in `packages/domain`'s
  in-memory repositories, behind the same ports a Postgres/Prisma adapter would implement —
  nothing survives a restart. Same for the offer cache (`InMemoryOfferCache` implements the
  same `CachePort` a Redis adapter would).
- **HS256 JWT with a shared dev secret**, not the RS256 keypair the architecture doc sketches.
- **No rate limiting / WAF / distributed tracing** — noted as Phase 6 candidates, not built.

## Monorepo layout

```
apps/
  api/            NestJS backend
  web/            Next.js frontend
services/
  mcp-blinkit/  mcp-zepto/  mcp-bigbasket/  mcp-flipkart/  mcp-amazon/
packages/
  contracts/          shared Zod schemas (MCP tools, Offer, Cart, Order, Address, API DTOs)
  mcp-toolkit/         thin @modelcontextprotocol/sdk wrappers (server + client)
  retailer-mcp-kit/    shared retailer MCP server implementation (the 11 tools, once)
  aggregation-core/    fan-out, circuit breaker, catalogue index, cache port
  pricing-core/        normalize, rank, DTO builders
  domain/              repository ports + in-memory adapters + cart grouping logic
  ui/                  MUI theme + shared components
  config/               tsconfig base + eslint boundaries config
scripts/            demo scripts (mcp-demo, mcp-checkout-demo, aggregation-demo)
```

## Tests run against this build

Everything below was exercised against the real, running stack (not just typechecked):

- MCP fan-out (`search_products` across 5 live servers) and full write flow
  (`create_cart`→`add_to_cart`→`checkout`) — via `pnpm mcp:demo` / `pnpm mcp:checkout-demo`.
- Aggregation + ranking reproduces Doc 05's worked example (Blinkit wins Amul Butter on
  landed price + ETA, not sticker price).
- Auth (OTP→JWT), server-authoritative cart (company-tabbed grouping verified with real
  multi-company baskets), address CRUD + default flip.
- Checkout: full success (3 companies, 3 real sub-order refs), idempotent retry (same
  `orderId` back), and partial failure (`OUT_OF_STOCK` sub-order → `PARTIALLY_CONFIRMED`
  order, `totalCapturedPaise < totalAuthorisedPaise`).
- All 12 Next.js routes render via real SSR against the live backend.
- Resilience: killed the Flipkart MCP process mid-session — search degraded to "4 of 5
  sources", checkout for the remaining 4 companies still completed, and the API process
  stayed up throughout (see `process.on("uncaughtException"/"unhandledRejection")` in
  `apps/api/src/main.ts` — added specifically because one fault-injection run crashed the
  process before that safety net existed).
