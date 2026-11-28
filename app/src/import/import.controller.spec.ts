import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminGuard } from "../auth/admin.guard.js";
import { ImportController } from "./import.controller.js";
import type { ImportService } from "./import.service.js";

// The transport hits the network through node:https: the URL-mode tests
// mock the module, keeping the real guard for the refusal paths.
vi.mock("./fetch-dataset.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./fetch-dataset.js")>();
  return {
    ...actual,
    fetchDataset: vi.fn(async (rawUrl: string) => {
      // Reuses the real guard: a refused URL still refuses.
      await actual.assertPublicHttpsUrl(rawUrl);
      return [{ key: "blinded", name: "Blinded", desc: "text" }];
    }),
  };
});

const SOURCE_ID = "00000000-0000-4000-8000-00000000000a";

describe("ImportController", () => {
  let service: {
    preview: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    purgePreview: ReturnType<typeof vi.fn>;
    purgeConfirm: ReturnType<typeof vi.fn>;
  };
  let controller: ImportController;

  beforeEach(() => {
    service = {
      preview: vi.fn(async () => ({ items: [] })),
      confirm: vi.fn(async () => ({ created: 0, updated: 0, skipped: [] })),
      purgePreview: vi.fn(async () => []),
      purgeConfirm: vi.fn(async () => ({ deleted: 0, blocked: [] })),
    };
    controller = new ImportController(service as unknown as ImportService);
  });

  it("carries the AdminGuard wiring on the class and every route", () => {
    const guards = Reflect.getMetadata("__guards__", ImportController) as
      | unknown[]
      | undefined;
    expect(guards).toContain(AdminGuard);
    const paths = ["preview", "confirm", "purgePreview", "purgeConfirm"].map((method) => {
      const handler = ImportController.prototype[method];
      if (typeof handler !== "function") throw new Error(`${method} missing`);
      return Reflect.getMetadata("path", handler) as string;
    });
    expect(paths.sort()).toEqual(["confirm", "preview", "purge", "purge"]);
  });

  it("previews and confirms a purge through the schema", async () => {
    await controller.purgePreview("conditions", SOURCE_ID);
    expect(service.purgePreview).toHaveBeenCalledWith("conditions", SOURCE_ID);
    await controller.purgeConfirm({
      catalog: "conditions",
      sourceId: SOURCE_ID,
      slugs: ["blinded"],
    });
    expect(service.purgeConfirm).toHaveBeenCalledWith("conditions", SOURCE_ID, ["blinded"]);
  });

  it("previews a file upload", async () => {
    const dataset = [
      { key: "blinded", name: "Blinded", desc: "* You can't see." },
    ];
    await controller.preview(
      { buffer: Buffer.from(JSON.stringify(dataset)), size: 42 },
      { catalog: "conditions", sourceId: SOURCE_ID },
    );
    expect(service.preview).toHaveBeenCalledWith(
      { catalog: "conditions", sourceId: SOURCE_ID },
      dataset,
    );
  });

  it("previews an endpoint URL fetched server-side", async () => {
    const dataset = [{ key: "blinded", name: "Blinded", desc: "text" }];
    await controller.preview(undefined, {
      catalog: "conditions",
      sourceId: SOURCE_ID,
      url: "https://api.open5e.com/v2/conditions/",
    });
    expect(service.preview).toHaveBeenCalledWith(
      { catalog: "conditions", sourceId: SOURCE_ID },
      dataset,
    );
  });

  it("refuses a non-HTTPS or private endpoint URL", async () => {
    await expect(
      controller.preview(undefined, {
        catalog: "conditions",
        sourceId: SOURCE_ID,
        url: "http://api.open5e.com/v2/conditions/",
      }),
    ).rejects.toMatchObject({ response: { code: "import_url_refused" } });
    await expect(
      controller.preview(undefined, {
        catalog: "conditions",
        sourceId: SOURCE_ID,
        url: "https://127.0.0.1/secret.json",
      }),
    ).rejects.toMatchObject({ response: { code: "import_url_refused" } });
    expect(service.preview).not.toHaveBeenCalled();
  });

  it("confirms with the accepted selection (JSON array or multipart string)", async () => {
    const dataset = [{ key: "blinded", name: "Blinded", desc: "text" }];
    const file = { buffer: Buffer.from(JSON.stringify(dataset)), size: 42 };
    await controller.confirm(file, {
      catalog: "conditions",
      sourceId: SOURCE_ID,
      accepted: ["blinded"],
    });
    expect(service.confirm).toHaveBeenCalledWith(
      { catalog: "conditions", sourceId: SOURCE_ID },
      dataset,
      ["blinded"],
    );
    await controller.confirm(file, {
      catalog: "conditions",
      sourceId: SOURCE_ID,
      accepted: JSON.stringify(["blinded", "charmed"]),
    });
    expect(service.confirm).toHaveBeenLastCalledWith(
      { catalog: "conditions", sourceId: SOURCE_ID },
      dataset,
      ["blinded", "charmed"],
    );
  });

  it("refuses a malformed accepted selection", async () => {
    const file = { buffer: Buffer.from("[]"), size: 2 };
    await expect(
      controller.confirm(file, {
        catalog: "conditions",
        sourceId: SOURCE_ID,
        accepted: "{not json",
      }),
    ).rejects.toMatchObject({ response: { code: "import_invalid_payload" } });
  });

  it("refuses an uploaded file that is not JSON", async () => {
    await expect(
      controller.preview({ buffer: Buffer.from("not json"), size: 8 }, {
        catalog: "conditions",
        sourceId: SOURCE_ID,
      }),
    ).rejects.toMatchObject({ response: { code: "import_invalid_payload" } });
  });
});
