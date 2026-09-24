const path = require("node:path");

/**
 * Shared "layer boundary" rules for the whole monorepo.
 *
 * This is the mechanical enforcement of the SOLID/layered architecture described in
 * QUICKCART-WEB-PLAN.md §1: a lower layer must never import an upper layer, and the only
 * thing allowed to import an MCP transport is the aggregation layer.
 *
 * Layers (lowest → highest):
 *   mcp          services/mcp-*, packages/mcp-toolkit, packages/retailer-mcp-kit
 *   aggregation  packages/aggregation-core, apps/api aggregation module
 *   transform    packages/pricing-core, apps/api transform module
 *   domain       packages/domain (cart/order ports+models — usable by transform/aggregation/bff)
 *   bff          apps/api gateway/auth/cart/order/address modules
 *   ui           apps/web, packages/ui
 *   contracts    packages/contracts — shared vocabulary, importable by everyone, imports nothing above it
 *
 * NOTE on resolution: at *runtime* every workspace package is consumed via its compiled
 * `dist/**` (each package.json `main` points there) through a pnpm node_modules symlink.
 * eslint-plugin-boundaries treats any import whose resolved path contains "node_modules" as
 * an *external* dependency and skips element-type checking for it entirely — which would
 * make every single cross-package `@quickcart/*` import invisible to this rule. The fix is
 * `../../tsconfig.lint.json`: a lint-only TS project with `paths` mapping `@quickcart/*`
 * straight to each package's `src`, so `eslint-import-resolver-typescript` resolves the
 * import to real source *before* node_modules ever enters the picture. That project is
 * never referenced by any build — it exists only so this lint check can see through the
 * package boundary.
 */
module.exports = {
  plugins: ["boundaries"],
  settings: {
    "import/resolver": {
      "eslint-import-resolver-typescript": { project: path.join(__dirname, "..", "..", "tsconfig.lint.json") },
    },
    // `mode: "full"`: match the whole relative-from-root path, not a folder-name suffix
    // (the plugin's default "folder" mode matches progressively from the right).
    "boundaries/elements": [
      { type: "contracts", mode: "full", pattern: "packages/contracts/src/**" },
      { type: "ui-kit", mode: "full", pattern: "packages/ui/src/**" },
      { type: "mcp", mode: "full", pattern: ["services/mcp-*/src/**", "packages/mcp-toolkit/src/**", "packages/retailer-mcp-kit/src/**"] },
      { type: "aggregation", mode: "full", pattern: ["packages/aggregation-core/src/**", "apps/api/src/aggregation/**"] },
      { type: "transform", mode: "full", pattern: ["packages/pricing-core/src/**", "apps/api/src/transform/**"] },
      { type: "domain", mode: "full", pattern: "packages/domain/src/**" },
      {
        type: "bff",
        mode: "full",
        pattern: [
          "apps/api/src/gateway/**",
          "apps/api/src/auth/**",
          "apps/api/src/cart/**",
          "apps/api/src/orders/**",
          "apps/api/src/addresses/**",
          "apps/api/src/common/**",
        ],
      },
      { type: "ui", mode: "full", pattern: "apps/web/src/**" },
    ],
  },
  rules: {
    "boundaries/element-types": [
      "error",
      {
        default: "disallow",
        rules: [
          // Every type may import its own type (sibling modules within one layer) plus
          // whatever lower layers the architecture allows — never a layer above it.
          { from: "contracts", allow: ["contracts"] },
          { from: "ui-kit", allow: ["ui-kit", "contracts"] },
          { from: "mcp", allow: ["mcp", "contracts"] },
          { from: "aggregation", allow: ["aggregation", "contracts", "mcp", "domain"] },
          { from: "transform", allow: ["transform", "contracts", "domain"] },
          { from: "domain", allow: ["domain", "contracts"] },
          { from: "bff", allow: ["bff", "contracts", "domain", "transform", "aggregation"] },
          { from: "ui", allow: ["ui", "contracts", "ui-kit"] },
        ],
      },
    ],
  },
};
