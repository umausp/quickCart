/**
 * Root, repo-wide check for the layered architecture (SOLID dependency direction).
 * Run with `pnpm lint:boundaries`. Individual packages have their own lightweight
 * `lint` script (type-check + basic rules) run via `turbo run lint`.
 */
module.exports = {
  root: true,
  extends: ["./packages/config/eslint-boundaries.cjs"],
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module", ecmaVersion: 2022 },
  ignorePatterns: [
    "**/dist/**",
    "**/node_modules/**",
    "**/.next/**",
    "**/.turbo/**"
  ]
};
