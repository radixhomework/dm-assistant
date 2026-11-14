import { beforeEach, describe, expect, it, vi } from "vitest";
import { EntitiesController } from "./entities.controller.js";
import { RelationshipsService } from "../relationships/relationships.service.js";
import type { EntitiesService } from "./entities.service.js";

function makeService(): vi.Mocked<EntitiesService> {
  return {
    list: vi.fn(async () => []),
    getBySlug: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    tracking: vi.fn(),
    referencesOf: vi.fn(async () => ({ leaders: [{ slug: "the-king", title: "The King" }] })),
    campaignOf: vi.fn(async () => null),
    statusOf: vi.fn(),
  } as unknown as vi.Mocked<EntitiesService>;
}

function makeRelationships(): vi.Mocked<RelationshipsService> {
  return {
    attachReference: vi.fn(async () => undefined),
    detachReference: vi.fn(async () => undefined),
  } as unknown as vi.Mocked<RelationshipsService>;
}

describe("EntitiesController", () => {
  let service: vi.Mocked<EntitiesService>;
  let relationships: vi.Mocked<RelationshipsService>;
  let controller: EntitiesController;

  beforeEach(() => {
    service = makeService();
    relationships = makeRelationships();
    controller = new EntitiesController(service, relationships);
  });

  it("lists records with filters", async () => {
    await controller.list("world", "places");
    expect(service.list).toHaveBeenCalledWith({
      perimeter: "world",
      type: "places",
    });
  });

  it("creates a record through the schema", async () => {
    const input = {
      slug: "city-of-glass",
      type: "places",
      perimeter: "world" as const,
      title: "City of Glass",
    };
    await controller.create({ user: { id: "user-1" } } as never, input);
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: "city-of-glass", tags: [] }),
      "user-1",
    );
  });

  it("updates through the schema", async () => {
    await controller.update("city-of-glass", { title: "Renamed" });
    expect(service.update).toHaveBeenCalledWith("city-of-glass", {
      title: "Renamed",
    });
  });

  it("deletes by slug", async () => {
    await controller.delete("city-of-glass");
    expect(service.delete).toHaveBeenCalledWith("city-of-glass");
  });

  it("reads a record with its tracking and owning campaign", async () => {
    service.getBySlug.mockResolvedValue({
      id: "1",
      slug: "north-realm",
      type: "campaign",
      perimeter: "campaign",
      title: "North",
      tags: [],
      fields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    service.tracking.mockResolvedValue({
      slug: "north-realm",
      title: "North",
      status: "played",
      children: [],
    });
    service.campaignOf.mockResolvedValue({ slug: "north-realm", title: "North" });
    const result = await controller.getBySlug("north-realm");
    expect(result.tracking.status).toBe("played");
    expect(result.campaign).toEqual({ slug: "north-realm", title: "North" });
  });

  it("attaches and detaches parents", async () => {
    await controller.attachParent("chapter-one", {
      parentSlug: "north-realm",
      kind: "campaign",
    });
    expect(relationships.attachReference).toHaveBeenCalledWith(
      "chapter-one",
      "campaign",
      "north-realm",
    );
    await controller.detachParent("chapter-one", "campaign");
    expect(relationships.detachReference).toHaveBeenCalledWith(
      "chapter-one",
      "campaign",
    );
  });
});
