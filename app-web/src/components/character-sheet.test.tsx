import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { CharacterSheet } from "./character-sheet.js";
import { RecordSheet } from "./record-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const character: Entity = {
  id: "1",
  slug: "frae",
  type: "characters-and-entities",
  perimeter: "world",
  title: "Fraë",
  tags: [],
  fields: {
    gender: "female",
    statistics: {
      strength: 18,
      dexterity: 14,
      ac: 15,
      hp: { average: 22, formula: "4d8" },
      size: "medium",
      creatureType: "humanoid",
      vulnerabilities: ["fire"],
    },
    public_description: "A tall figure.",
  },
  references: {
    species: [{ slug: "humans", title: "Humans" }],
  },
};

describe("CharacterSheet", () => {
  it("renders the ability scores with their SRD modifiers", () => {
    renderWithProviders(<CharacterSheet record={character} />);
    // STR 18 → +4.
    expect(screen.getByText(/^18/).textContent).toContain("(+4)");
    expect(screen.getByText(/^14/).textContent).toContain("(+2)");
  });

  it("renders the combat chips and the damage vulnerabilities", () => {
    renderWithProviders(<CharacterSheet record={character} />);
    expect(screen.getByText("15")).toBeDefined();
    expect(screen.getByText("22 (4d8)")).toBeDefined();
    expect(screen.getByText("humanoid")).toBeDefined();
    expect(screen.getByText("fire")).toBeDefined();
  });

  it("renders the typed references as links", () => {
    renderWithProviders(<CharacterSheet record={character} />);
    expect(screen.getByText("Humans")).toBeDefined();
  });

  it("renders the prose blocks through the readonly editor", () => {
    renderWithProviders(<CharacterSheet record={character} />);
    expect(screen.getByText("A tall figure.")).toBeDefined();
  });
});

describe("RecordSheet", () => {
  it("lists the children of a campaign in play order", () => {
    const campaign: Entity = {
      id: "2",
      slug: "campagne-1",
      type: "campaign",
      perimeter: "campaign",
      title: "Campagne 1",
      tags: [],
      fields: {},
      tracking: {
        slug: "campagne-1",
        status: "not_played",
        children: [
          { slug: "chap1", title: "Chap1", status: "not_played" },
          { slug: "chap2", title: "Chap2", status: "not_played" },
        ],
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<RecordSheet record={campaign} />);
    expect(screen.getByText("Chapters")).toBeDefined();
    expect(screen.getByText("Chap1")).toBeDefined();
    expect(screen.getByText("Chap2")).toBeDefined();
  });

  it("falls back to the generic rows for non-bespoke templates", () => {
    const place: Entity = {
      id: "3",
      slug: "city",
      type: "places",
      perimeter: "world",
      title: "City",
      tags: [],
      fields: { population: "1M" },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.endsWith("/backlinks")) {
          return { ok: true, json: async () => ({ fields: {}, mentions: [] }) };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
    renderWithProviders(<RecordSheet record={place} />);
    expect(screen.getByText("1M")).toBeDefined();
  });
});
