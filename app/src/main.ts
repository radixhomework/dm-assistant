import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import session from "express-session";
import * as path from "node:path";
import { envSchema, type Env } from "@dm/schemas";
import { AppModule } from "./app.module.js";
import { SessionStore } from "./auth/session.store.js";

function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const names = [
      ...new Set(result.error.issues.map((issue) => issue.path.join(".") || "env")),
    ];
    console.error(`Invalid configuration — offending variables: ${names.join(", ")}`);
    console.error(result.error.message);
    process.exit(1);
  }
  return result.data;
}

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const logger = new Logger("bootstrap");
  const app = await NestFactory.create<NestExpressApplication>(
    AppModule.register(env),
    { logger: ["log", "warn", "error"] },
  );

  // Static shell + session middleware registered BEFORE init: Nest mounts
  // its routes (and its 404 handler) after, so /api and /mcp always win via
  // the guards below. Single door — ARCHITECTURE.md §1.
  const dist = path.resolve(__dirname, "../../app-web/dist");
  app.use(express.static(dist, { index: false }));
  app.use(
    session({
      name: "dm.sid",
      secret: env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      store: app.get(SessionStore, { strict: false }),
      cookie: {
        httpOnly: true,
        sameSite: "strict",
        // TLS termination happens at the reverse proxy (P6) — flip
        // COOKIE_SECURE then (Sonar S2092: conditional, not literal false).
        secure: env.COOKIE_SECURE === "true",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      },
    }),
  );
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (
      req.method !== "GET" ||
      req.path.startsWith("/api") ||
      req.path.startsWith("/mcp")
    ) {
      next();
      return;
    }
    void res.sendFile(path.join(dist, "index.html"));
  });

  await app.listen(env.PORT);
  logger.log(`DM Assistant listening on port ${env.PORT}`);
}

void bootstrap();
