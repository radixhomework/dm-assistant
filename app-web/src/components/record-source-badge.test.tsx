import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { RecordSheet } from "./record-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode; to: string }) => (
      <a href={props.to}>{props.children}</a>
    ),
  };
});

beforeEach(() => {
  document.documentElement.lang = "en";
  document.body.innerHTML = "";
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok: true,
    json: async () => ({ fields: {}, mentions: [] }),
  })));
});

function record(source: Entity["source"], type = "conditions"): Entity {
  return {
    id: "r1",
    slug: "blinded",
    type,
    perimeter: "world",
    title: "Blinded",
    tags: [],
    fields: {},
    source,
  };
}

describe("Source badge on record sheets (srd-catalog-import spec)", () => {
  it("shows the Internal badge for an internal catalog record", () => {
    renderWithProviders(
      <RecordSheet record={record({ id: "s0", name: "Internal", internal: true })} />,
      { client: new QueryClient() },
    );
    expect(screen.getByText("Internal")).toBeDefined();
    expect(screen.queryByRole("link", { name: "Internal" })).toBeNull();
  });

  it("shows an external badge naming its source and leading to the attribution page", () => {
    renderWithProviders(
      <RecordSheet record={record({ id: "s1", name: "Open5e (SRD 5.2)", internal: false })} />,
      { client: new QueryClient() },
    );
    const badge = screen.getByRole("link", { name: "Open5e (SRD 5.2)" });
    expect(badge.getAttribute("href")).toBe("/attribution");
  });

  it("carries no badge on a non-catalog record or a sourceless record", () => {
    renderWithProviders(
      <RecordSheet record={record(null, "places")} />,
      { client: new QueryClient() },
    );
    expect(screen.queryByText("Internal")).toBeNull();
    renderWithProviders(
      <RecordSheet record={record(null)} />,
      { client: new QueryClient() },
    );
    expect(screen.queryByText("Internal")).toBeNull();
    expect(screen.queryByRole("link", { name: "Open5e (SRD 5.2)" })).toBeNull();
  });
});
