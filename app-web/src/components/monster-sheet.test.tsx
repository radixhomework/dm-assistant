import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { MonsterSheet } from "./monster-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const monster: Entity = {
  id: "1",
  slug: "monstera",
  type: "monsters",
  perimeter: "world",
  title: "Monstera",
  tags: [],
  fields: {
    statistics: {
      ac: 13,
      hp: { average: 33, formula: "6d8+6" },
      size: "medium",
      speed: { fly: 18, walk: 6 },
      strength: 16,
      dexterity: 12,
      constitution: 13,
      intelligence: 8,
      wisdom: 12,
      charisma: 10,
      alignment: "chaotic_evil",
      creatureType: "monstrosity",
    },
    traits: "Repli aérien. Le péryton ne provoque pas d'attaque d'Opportunité.",
    actions: "Attaques multiples. Le péryton effectue deux attaques.",
  },
  references: {
    languages: [{ id: "id-fraelish", slug: "fraelish", title: "Fraëlish" }],
    treasure_types: [{ id: "id-trinkets", slug: "trinkets", title: "Bibelots" }],
  },
};

describe("MonsterSheet", () => {
  it("renders the statistics block", () => {
    renderWithProviders(<MonsterSheet record={monster} />);
    expect(screen.getByText("AC")).toBeDefined();
    // The HP row renders "average (formula)" as one text run.
    const hpRow = screen.getByText("HP").closest("p");
    expect(hpRow?.textContent).toContain("33 (6d8+6)");
  });

  it("renders the stat-adjacent references as link groups", () => {
    renderWithProviders(<MonsterSheet record={monster} />);
    expect(screen.getByText("Languages")).toBeDefined();
    expect(screen.getByText("Fraëlish")).toBeDefined();
    expect(screen.getByText("Treasure types")).toBeDefined();
    expect(screen.getByText("Bibelots")).toBeDefined();
  });

  it("renders the prose sections in SRD order", () => {
    renderWithProviders(<MonsterSheet record={monster} />);
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toContain("Traits");
    expect(headings).toContain("Actions");
    expect(headings.indexOf("Traits")).toBeLessThan(headings.indexOf("Actions"));
  });
});
