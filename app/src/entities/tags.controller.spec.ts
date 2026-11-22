import { beforeEach, describe, expect, it, vi } from "vitest";
import { TagsController } from "./tags.controller.js";

describe("TagsController", () => {
  let execute: ReturnType<typeof vi.fn>;
  let controller: TagsController;

  beforeEach(() => {
    execute = vi.fn(async () => [
      { tag: "cartographie", count: "2" },
      { tag: "voyage", count: "1" },
    ]);
    controller = new TagsController({ execute } as never);
  });

  it("returns the alphabetically ordered inventory with counts", async () => {
    const inventory = await controller.inventory();
    expect(inventory).toEqual([
      { tag: "cartographie", count: 2 },
      { tag: "voyage", count: 1 },
    ]);
  });

  it("coerces the bigint counts to numbers", async () => {
    execute.mockResolvedValue([{ tag: "solo", count: 0 }]);
    const inventory = await controller.inventory();
    expect(inventory).toEqual([{ tag: "solo", count: 0 }]);
  });
});
