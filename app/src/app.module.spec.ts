import { describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { envSchema, type Env } from "@dm/schemas";
import { AppModule } from "./app.module.js";
import { HealthController } from "./api/health.controller.js";
import { ENV } from "./config/env.js";

const env: Env = envSchema.parse({});

describe("AppModule", () => {
  it("wires the modulith graph and exposes the validated env", async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register(env)],
    }).compile();

    expect(moduleRef.get(HealthController, { strict: false })).toBeInstanceOf(
      HealthController,
    );
    expect(moduleRef.get(ENV, { strict: false })).toEqual(env);
  });
});
