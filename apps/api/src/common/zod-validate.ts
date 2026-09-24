import { BadRequestException } from "@nestjs/common";
import type { z } from "zod";

/** Every controller validates its body/query with a shared contracts Zod schema through
 * this helper instead of class-validator DTOs — one source of truth for shapes across the
 * MCP tools, the API and (imported straight into `apps/web`) the client. */
export function validate<T>(schema: z.ZodType<T, any, any>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException({ error: "validation_error", issues: result.error.issues });
  }
  return result.data;
}
