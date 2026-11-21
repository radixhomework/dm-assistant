import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { NationSheet } from "./nation-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const nation: Entity = {
  id: "1",
  slug: "plenear",
  type: "nations",
  perimeter: "world",
  title: "Plenear",
  tags: [],
  fields: {
    population: "10 millions",
    political_system: "republic",
    public_description: "Région méridionale de Fraëweld.",
  },
  references: {
    capital: [{ id: "id-tremling", slug: "tremling", title: "Tremling" }],
    geography: [{ id: "id-veldra", slug: "veldra", title: "Veldra" }],
    organizations: [{ id: "id-cercle-du-peridot", slug: "cercle-du-peridot", title: "Cercle du Péridot" }],
  },
};

describe("NationSheet", () => {
  it("renders the population and the translated political system as chips", () => {
    renderWithProviders(<NationSheet record={nation} />);
    expect(screen.getByText("10 millions")).toBeDefined();
    expect(screen.getByText("Republic")).toBeDefined();
    expect(screen.queryByText("republic")).toBeNull();
  });

  it("renders the capital as the structural reference", () => {
    renderWithProviders(<NationSheet record={nation} />);
    expect(screen.getByText("Capital")).toBeDefined();
    expect(screen.getByText("Tremling")).toBeDefined();
  });

  it("renders the associative references below the prose sections", () => {
    renderWithProviders(<NationSheet record={nation} />);
    // Geography (associative) appears after the prose section heading.
    const proseHeading = screen.getByText("Public description");
    const geography = screen.getByText("Geography");
    expect(proseHeading.compareDocumentPosition(geography) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Cercle du Péridot")).toBeDefined();
  });

  it("renders the descriptions as headed frameless sections", () => {
    renderWithProviders(<NationSheet record={nation} />);
    expect(screen.getByText("Public description")).toBeDefined();
    expect(screen.getByText("Région méridionale de Fraëweld.")).toBeDefined();
  });
});
