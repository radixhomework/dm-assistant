import { describe, expect, it } from "vitest";
import {
  createEntitySchema,
  parentSchema,
  slugSchema,
  updateEntitySchema,
} from "./entities.js";
import { loginSchema, wizardSchema } from "./auth.js";
import { updateSettingsSchema } from "./settings.js";

describe("entity schemas", () => {
  it("accepts a valid entity creation with defaults", () => {
    const parsed = createEntitySchema.parse({
      slug: "north-realm",
      type: "campaign",
      perimeter: "campaign",
      title: "The North Realm",
    });
    expect(parsed.tags).toEqual([]);
    expect(parsed.fields).toEqual({});
    expect(parsed.body).toBe("");
  });

  it("rejects an invalid slug", () => {
    expect(slugSchema.safeParse("Invalid Slug!").success).toBe(false);
    expect(slugSchema.safeParse("north-realm").success).toBe(true);
  });

  it("updates without touching the slug", () => {
    const parsed = updateEntitySchema.parse({ title: "New title" });
    expect(parsed.title).toBe("New title");
    expect("slug" in parsed).toBe(false);
  });

  it("accepts a hierarchy attachment", () => {
    const parsed = parentSchema.parse({
      parentSlug: "north-realm",
      kind: "chapter",
    });
    expect(parsed.parentSlug).toBe("north-realm");
  });
});

describe("auth schemas", () => {
  it("accepts a valid wizard payload", () => {
    const parsed = wizardSchema.parse({
      email: "dm@example.com",
      password: "a-long-enough-passphrase",
      displayName: "The DM",
      worldName: "My World",
      contentLanguage: "fr",
    });
    expect(parsed.email).toBe("dm@example.com");
  });

  it("rejects a short password", () => {
    const result = wizardSchema.safeParse({
      email: "dm@example.com",
      password: "short",
      displayName: "The DM",
      worldName: "My World",
      contentLanguage: "en",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a malformed login email", () => {
    expect(loginSchema.safeParse({ email: "not-an-email", password: "x" }).success).toBe(false);
  });
});

describe("settings schemas", () => {
  it("accepts partial updates", () => {
    const parsed = updateSettingsSchema.parse({ distanceUnit: "m" });
    expect(parsed.distanceUnit).toBe("m");
  });

  it("rejects an invalid unit", () => {
    expect(updateSettingsSchema.safeParse({ distanceUnit: "miles" }).success).toBe(
      false,
    );
  });
});
