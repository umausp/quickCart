import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

/**
 * Doc 03 §"Reliability": a down MCP source must degrade the response, never the process.
 * `gatherFromSources` already contains every *promise*-based failure per call site — these
 * two handlers are the last line of defense against anything that slips past that (e.g. a
 * stray event-emitter 'error' from a broken HTTP/SSE socket) so one dead retailer can never
 * take the whole gateway down. They log loudly and keep serving instead of crashing.
 */
process.on("unhandledRejection", (reason) => {
  console.error("[api] UNHANDLED REJECTION (kept process alive):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[api] UNCAUGHT EXCEPTION (kept process alive):", err);
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix("v1");
  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  console.log(`[api] QuickCart API listening on http://localhost:${port}/v1`);
}

bootstrap().catch((err) => {
  console.error("[api] failed to start", err);
  process.exit(1);
});
