import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { EquipmentSheet } from "./equipment-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const item: Entity = {
  id: "1",
  slug: "potion-d-inamandla-raffinee",
  type: "equipment-and-items",
  perimeter: "world",
  title: "Inamandla raffinée",
  tags: [],
  fields: {
    value: { amount: 750, currency: "gp" },
    weight: "s",
    rarity: "rare",
    size: "small",
    level: "5",
    public_description: "Une solution liquide violacée.",
  },
  references: {},
};

describe("EquipmentSheet", () => {
  it("renders the mechanical traits as chips", () => {
    renderWithProviders(<EquipmentSheet record={item} />);
    const valueChip = screen.getByText("Value").closest('span[class*="rounded-md"]');
    expect(valueChip?.textContent).toBe("Value 750 GP");
    expect(screen.getByText("Rare")).toBeDefined();
    expect(screen.getByText("Small")).toBeDefined();
    expect(screen.getByText("5")).toBeDefined();
  });

  it("renders the prose sections in template order", () => {
    const full: Entity = {
      ...item,
      fields: {
        ...item.fields,
        characteristics: "Effets à l'ingestion.",
        commerce: "Vendue par les herboristes de Tremling.",
        private_description: "Secrète.",
      },
    };
    renderWithProviders(<EquipmentSheet record={full} />);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((h) => h.textContent);
    const positions = ["Public description", "Characteristics", "Trade", "Private description"].map(
      (label) => headings.indexOf(label),
    );
    expect(positions.every((pos) => pos >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("renders the illustration as a banner image when set", () => {
    const withImage: Entity = {
      ...item,
      fields: { ...item.fields, illustration: "/assets/potion.png" },
    };
    renderWithProviders(<EquipmentSheet record={withImage} />);
    expect(document.querySelector("img")?.getAttribute("src")).toBe("/assets/potion.png");
  });
});
