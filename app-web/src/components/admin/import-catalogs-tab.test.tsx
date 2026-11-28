import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { ImportCatalogsTab } from "./import-catalogs-tab.js";
import { renderWithProviders } from "../../testing/render.js";

const SOURCE_ID = "00000000-0000-4000-8000-00000000000a";

/** The dataset the preview scenarios run on: one new element, one
 * same-source overwrite (pre-checked), one cross-source conflict, one
 * invalid element. */
const PREVIEW_ITEMS = [
  { slug: "new-thing", title: "New thing", status: "new" },
  {
    slug: "same-source",
    title: "Same source (v2)",
    status: "overwrite",
    preChecked: true,
    existingTitle: "Same source",
    existingSourceName: "Open5e (SRD 5.2)",
  },
  {
    slug: "cross-source",
    title: "Cross source",
    status: "conflict",
    preChecked: false,
    existingTitle: "Cross source (held)",
    existingSourceName: "Internal",
  },
  { slug: "", title: "", status: "skipped", reason: "invalid_element" },
];

describe("ImportCatalogsTab", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/sources") {
          return {
            ok: true,
            json: async () => [
              { id: "s0", name: "Internal", attribution: null, internal: true, disabled: false },
              { id: SOURCE_ID, name: "Open5e (SRD 5.2)", attribution: null, internal: false, disabled: false },
            ],
          };
        }
        if (input === "/api/admin/catalogs/import/preview") {
          return {
            ok: true,
            json: async () => ({ items: PREVIEW_ITEMS }),
          };
        }
        if (input === "/api/admin/catalogs/import/confirm") {
          return {
            ok: true,
            json: async () => ({
              created: 1,
              updated: 2,
              skipped: [{ slug: "", title: "", reason: "invalid_element" }],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
  });

  async function openPreview(): Promise<void> {
    renderWithProviders(<ImportCatalogsTab />);
    await vi.waitFor(() =>
      expect(screen.getByText("Target catalog")).toBeDefined(),
    );
    // Endpoint mode (the file input cannot be filled in jsdom): pick the
    // source, set the URL, then run the preview.
    fireEvent.click(screen.getByRole("radio", { name: "API endpoint URL" }));
    fireEvent.change(screen.getByRole("textbox", { name: "API endpoint URL" }), {
      target: { value: "https://api.open5e.com/v2/conditions/" },
    });
    // The source options load asynchronously — wait before selecting.
    await vi.waitFor(() =>
      expect(screen.getByRole("option", { name: "Open5e (SRD 5.2)" })).toBeDefined(),
    );
    const sourceSelect = screen.getAllByRole("combobox")[1];
    fireEvent.change(sourceSelect, { target: { value: SOURCE_ID } });
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    await vi.waitFor(() =>
      expect(screen.getByText("New thing")).toBeDefined(),
    );
  }

  it("renders the preview classes: new rows without a checkbox, overwrites pre-checked, conflicts unchecked, skips with their reason", async () => {
    await openPreview();
    // New element: no checkbox of its own.
    expect(screen.queryByLabelText("Import over New thing")).toBeNull();
    // Overwrite pre-checked, conflict unchecked.
    const overwriteBox = screen.getByLabelText("Import over Same source (v2)");
    expect((overwriteBox as HTMLInputElement).checked).toBe(true);
    const conflictBox = screen.getByLabelText("Import over Cross source");
    expect((conflictBox as HTMLInputElement).checked).toBe(false);
    // The skip reason shows.
    expect(screen.getByText(/Invalid element for the dataset format/)).toBeDefined();
  });

  it("select-all covers every selectable element at once", async () => {
    await openPreview();
    fireEvent.click(screen.getByLabelText("Select all"));
    expect((screen.getByLabelText("Import over Same source (v2)") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Import over Cross source") as HTMLInputElement).checked).toBe(true);
    // Deactivating clears every checkbox.
    fireEvent.click(screen.getByLabelText("Select all"));
    expect((screen.getByLabelText("Import over Same source (v2)") as HTMLInputElement).checked).toBe(false);
    expect((screen.getByLabelText("Import over Cross source") as HTMLInputElement).checked).toBe(false);
  });

  it("confirms the accepted set and shows the report", async () => {
    await openPreview();
    fireEvent.click(screen.getByLabelText("Import over Cross source"));
    fireEvent.click(screen.getByRole("button", { name: "Confirm import" }));
    await vi.waitFor(() =>
      expect(screen.getByText(/1 created, 2 updated\./)).toBeDefined(),
    );
    // The preview closes after the run.
    expect(screen.queryByText("New thing")).toBeNull();
  });
});
