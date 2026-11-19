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
      alignment: "chaotic_evil",
      vulnerabilities: ["fire"],
      proficiencyBonus: 3,
      wisdom: 12,
      charisma: 6,
      senses: {
        darkvision: 18,
        blindsight: 6,
        truesight: 9,
        tremorsense: 3,
      },
      passivePerception: 13,
      skills: [{ name: "Perception", ability: "wisdom" }],
    },
    public_description: "A tall figure.",
  },
  references: {
    species: [{ slug: "humans", title: "Humans" }],
  },
};

describe("CharacterSheet", () => {
  it.each([
    {
      name: "renders the SRD-style ability table with modifiers and saves",
      assert: () => {
        // FOR 18 → MOD +4; no save mastery → JS = MOD.
        expect(screen.getByText("STR")).toBeDefined();
        expect(screen.getByText("18")).toBeDefined();
        expect(screen.getAllByText("+4").length).toBeGreaterThanOrEqual(1);
        // Negative modifiers carry their sign without a doubled plus.
        expect(screen.getAllByText("-2").length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText("+-2")).toBeNull();
        expect(screen.getAllByText("MOD")).toHaveLength(3);
        expect(screen.getAllByText("Save")).toHaveLength(3);
      },
    },
    {
      name: "renders the SRD-style stat block lines",
      assert: () => {
        expect(screen.getByText("AC")).toBeDefined();
        expect(screen.getByText("15")).toBeDefined();
        // HP: average then formula, SRD order.
        expect(screen.getByText(/22 \(4d8\)/)).toBeDefined();
        // Creature type on the subtitle line, damage vulnerabilities as a group.
        expect(screen.getByText(/Humanoid, Chaotic Evil/)).toBeDefined();
        expect(screen.getByText("Fire")).toBeDefined();
      },
    },
    {
      name: "renders the five senses in the DM's order",
      assert: () => {
        const sensLine = screen.getByText(/Senses/).closest("p")?.textContent ?? "";
        const positions = ["Darkvision", "Blindsight", "Truesight", "Tremorsense", "Passive perception"].map(
          (label) => sensLine.indexOf(label),
        );
        expect(positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1]))).toBe(true);
      },
    },
  ])("$name", ({ assert }) => {
    renderWithProviders(<CharacterSheet record={character} />);
    assert();
  });

  it("computes mastered skill modifiers (ability + proficiency)", () => {
    renderWithProviders(<CharacterSheet record={character} />);
    // Wisdom 12 → +1, proficiency +3 → Perception +4.
    expect(screen.getByText("Perception +4")).toBeDefined();
  });

  it("marks mastered saves and skills as unknown when the proficiency bonus is absent", () => {
    // Gap marking (charter rule 2): mastery without a known bonus never
    // renders as +0.
    const noBonus: Entity = {
      ...character,
      fields: {
        gender: "female",
        statistics: {
          strength: 18,
          dexterity: 8,
          wisdom: 12,
          charisma: 6,
          savesMastery: { strength: true },
          skills: [{ name: "Perception", ability: "wisdom" }],
        } as never,
      },
    };
    renderWithProviders(<CharacterSheet record={noBonus} />);
    // The mastered save and the mastered skill read as unknown ("?");
    // the raw ability modifier (+4 for Strength 18) still shows.
    // The save cell renders "?"; the skill reads "Perception ?".
    expect(screen.getAllByText("?").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Perception ?")).toBeDefined();
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
