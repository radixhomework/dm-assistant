import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchController } from "./search.controller.js";
import type { SearchService } from "./search.service.js";

function makeService(): vi.Mocked<SearchService> {
  return {
    search: vi.fn(async () => [
      {
        id: "uuid-1",
        slug: "ecole-de-magie",
        title: "École de magie",
        type: "places",
        perimeter: "world",
        tags: [],
        snippet: "une ⟦école⟧ réputée",
      },
    ]),
  } as unknown as vi.Mocked<SearchService>;
}

describe("SearchController", () => {
  let service: vi.Mocked<SearchService>;
  let controller: SearchController;

  beforeEach(() => {
    service = makeService();
    controller = new SearchController(service);
  });

  it("passes the query and filters to the service", async () => {
    await controller.search("ecole", "places", "voyage");
    expect(service.search).toHaveBeenCalledWith({ q: "ecole", type: "places", tag: "voyage" });
  });

  it("treats a missing query as empty", async () => {
    await controller.search();
    expect(service.search).toHaveBeenCalledWith({ q: "", type: undefined, tag: undefined });
  });

  it("returns the service hits as-is", async () => {
    const hits = await controller.search("ecole");
    expect(hits).toHaveLength(1);
    expect(hits[0].slug).toBe("ecole-de-magie");
  });
});
