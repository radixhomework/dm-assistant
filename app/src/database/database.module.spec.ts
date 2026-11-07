import type { DynamicModule } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { envSchema, type Env } from "@dm/schemas";
import { DatabaseModule, DB } from "./database.module.js";
import { ENV } from "../config/env.js";

describe("DatabaseModule", () => {
  it("builds the Drizzle client from the validated configuration", async () => {
    const env: Env = envSchema.parse({});

    // Mirrors AppModule: ENV is a global provider in the real application.
    // Declared as an inline DynamicModule — no decorators in this spec file
    // (vitest's CJS transform cannot parse them here).
    const TestEnvModule: DynamicModule = {
      global: true,
      module: class TestEnvModule {},
      providers: [{ provide: ENV, useValue: env }],
      exports: [ENV],
    };

    const moduleRef = await Test.createTestingModule({
      imports: [TestEnvModule, DatabaseModule],
    }).compile();

    expect(moduleRef.get(DB, { strict: false })).toBeDefined();
  });
});
