import { Global, Module } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { envSchema, type Env } from "@dm/schemas";
import { DatabaseModule, DB } from "./database.module.js";
import { ENV } from "../config/env.js";

// Mirrors AppModule: ENV is a global provider in the real application.
@Global()
@Module({
  providers: [
    {
      provide: ENV,
      useValue: envSchema.parse({}),
    },
  ],
  exports: [ENV],
})
class TestEnvModule {}

describe("DatabaseModule", () => {
  it("builds the Drizzle client from the validated configuration", async () => {
    const env: Env = envSchema.parse({});
    const moduleRef = await Test.createTestingModule({
      imports: [TestEnvModule, DatabaseModule],
      providers: [{ provide: ENV, useValue: env }],
    }).compile();

    expect(moduleRef.get(DB, { strict: false })).toBeDefined();
  });
});
