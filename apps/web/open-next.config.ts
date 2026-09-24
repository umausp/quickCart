import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * No ISR/on-demand revalidation anywhere in this app (every page is a Server Component doing
 * a live, no-store fetch to the API — see `apps/web/src/lib/api.ts`), so the default config
 * with no incremental cache override is enough; nothing here needs KV or R2.
 */
export default defineCloudflareConfig();
