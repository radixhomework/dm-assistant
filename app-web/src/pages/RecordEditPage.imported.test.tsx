import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { LoreRecordPage } from "./RecordEditPage";
import { renderWithProviders } from "../testing/render.js";

const searchState: { edit?: string | boolean } = {};

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    useParams: () => ({ id: "rec-1" }),
    useNavigate: () => ({ to: vi.fn() }),
    useRouterState: (opts?: { select?: (s: unknown) => unknown }) => {
      const state = { location: { pathname: "/lore/rec-1", search: searchState } };
      return opts?.select ? opts.select(state) : state;
    },
    Link: (props: { children?: ReactNode }) => <a href="#">{props.children}</a>,
  };
});

const importedRecord = {
  id: "rec-1",
  slug: "blinded",
  type: "conditions",
  perimeter: "world",
  title: "Blinded",
  tags: ["etat"],
  fields: {
    public_description: "SRD text.",
    pitch: "The DM hook.",
    private_description: "Private note.",
  },
  source: { id: "s1", name: "Open5e (SRD 5.2)", internal: false },
};

function stubRecord(record: unknown) {
  return vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input === "/api/auth/me") {
        return {
          ok: true,
          json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
        };
      }
      if (input.endsWith("/backlinks")) {
        return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
      }
      if (input === "/api/records/rec-1" && init?.method === "PATCH") {
        return { ok: true, json: async () => ({}) };
      }
      return { ok: true, json: async () => record };
    }),
  );
}

describe("Imported record sheet (srd-catalog-import spec)", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    searchState.edit = undefined;
  });

  it("splits the read view: no delete action on an imported record", async () => {
    stubRecord(importedRecord);
    renderWithProviders(<LoreRecordPage />);
    await vi.waitFor(() => expect(screen.getByText("Blinded")).toBeDefined());
    expect(screen.queryByRole("button", { name: "Delete" })).toBeNull();
    // The edit action stays: the DM-authored fields remain authorable.
    expect(screen.getByRole("button", { name: "Edit" })).toBeDefined();
  });

  it("offers only the Pitch and Private description in edit mode", async () => {
    stubRecord(importedRecord);
    renderWithProviders(<LoreRecordPage />);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await vi.waitFor(() =>
      expect(screen.getByText("Imported record: only the Pitch and the Private description are editable; the source data changes through a re-import.")).toBeDefined(),
    );
    // The title, the tags editor and the source-derived fields carry no
    // edit control; the DM-authored prose editors render.
    expect(screen.queryByLabelText("Title")).toBeNull();
    expect(screen.queryByText("Tags")).toBeNull();
    expect(screen.queryByText("Public description")).toBeNull();
    expect(screen.getByText("Pitch")).toBeDefined();
    expect(screen.getByText("Private description")).toBeDefined();
  });

  it("saves only the DM-authored fields and keeps the tags unchanged", async () => {
    const patchBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
        if (input === "/api/auth/me") {
          return {
            ok: true,
            json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
          };
        }
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        if (input === "/api/records/rec-1" && init?.method === "PATCH") {
          patchBodies.push(JSON.parse(String(init.body)));
          return { ok: true, json: async () => ({}) };
        }
        return { ok: true, json: async () => importedRecord };
      }),
    );
    renderWithProviders(<LoreRecordPage />);
    await vi.waitFor(() => expect(screen.getByRole("button", { name: "Edit" })).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await vi.waitFor(() => expect(screen.getByText("Pitch")).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await vi.waitFor(() => expect(patchBodies.length).toBeGreaterThan(0));
    const body = patchBodies[0] as { title?: string; tags: string[]; fields: Record<string, unknown> };
    expect(body.title).toBeUndefined();
    expect(body.tags).toEqual(["etat"]);
    expect(Object.keys(body.fields).sort()).toEqual(["pitch", "private_description"]);
  });
});
