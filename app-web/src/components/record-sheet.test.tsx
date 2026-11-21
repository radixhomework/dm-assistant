import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { RecordSheet, TitleLinks } from "./record-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: {
      children?: React.ReactNode;
      to: string;
      params: Record<string, string>;
    }) => <a href={props.to.replace(/\$(\w+)/g, (_, key: string) => props.params[key])}>{props.children}</a>,
  };
});

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML = "";
});

it("waits for a record URL and retries a failed lookup before linking", async () => {
  const fetchRecord = vi.fn()
    .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ message: "Unavailable" }) })
    .mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "scene-id",
        type: "scene",
        perimeter: "campaign",
        campaign: { id: "campaign-id" },
        references: { chapter: [{ id: "chapter-id" }] },
      }),
    });
  vi.stubGlobal("fetch", fetchRecord);
  renderWithProviders(
    <TitleLinks targets={[{ id: "scene-id", slug: "scene", title: "Scene" }]} />,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
  );
  expect(screen.getByText(/Loading/)).toBeDefined();
  expect(screen.queryByRole("link")).toBeNull();
  const retry = await screen.findByRole("button", { name: "Retry loading link to Scene" });
  expect(screen.queryByRole("link")).toBeNull();
  fireEvent.click(retry);
  const link = await screen.findByRole("link", { name: "Scene" });
  expect(link.getAttribute("href")).toBe("/campaigns/campaign-id/chapter-id/scene-id");
});

describe("RecordSheet scaffold", () => {
  it("renders every field kind through the generic rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/backlinks")) {
          return {
            ok: true,
            json: async () => ({
              fields: { nations: [{ id: "id-plenear", slug: "plenear", title: "Plenear" }] },
              mentions: [{ id: "id-monstera", slug: "monstera", title: "Monstera" }],
            }),
          };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    const record = {
      id: "1",
      slug: "mixed",
      type: "places",
      perimeter: "world",
      title: "Mixed",
      tags: [],
      fields: {
        population: "1234",
        place_type: "city",
        public_description: "**Bold** prose.",
      },
      references: {},
    } as unknown as Entity;
    renderWithProviders(<RecordSheet record={record} />);
    // Text → plain row.
    expect(screen.getByText("1234")).toBeDefined();
    // Enum → translated.
    expect(screen.getByText("City")).toBeDefined();
    // Prose → readonly editor.
    expect(document.querySelector("strong")?.textContent).toBe("Bold");
    // Backlinks: field group + incoming mentions.
    await vi.waitFor(() => {
      expect(screen.getByText("Nations")).toBeDefined();
      expect(screen.getByText("Plenear")).toBeDefined();
      expect(screen.getByText("Incoming mentions")).toBeDefined();
      expect(screen.getByText("Monstera")).toBeDefined();
    });
  });

  it("renders a dated field with its era through the calendar formats", () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 204, json: async () => ({}) })));
    const record = {
      id: "1",
      slug: "an-event",
      type: "events",
      perimeter: "world",
      title: "An event",
      tags: [],
      fields: {
        start: { era: "An", year: 842, month: 1, day: 5 },
      },
      references: {},
    } as unknown as Entity;
    renderWithProviders(<RecordSheet record={record} />);
    // The era prefixes the localized date (definition-less: raw month).
    expect(screen.getByText(/An/)).toBeDefined();
    expect(screen.getByText(/842/)).toBeDefined();
  });
});
