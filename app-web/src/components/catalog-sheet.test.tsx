import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { CatalogSheet } from "./catalog-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const catalog: Entity = {
  id: "1",
  slug: "barde",
  type: "classes",
  perimeter: "world",
  title: "Barde",
  tags: [],
  fields: {
    pitch: "Bretteur inspiré, magicien du verbe.",
    public_description: "La magie du barde repose sur les mots et la musique.",
  },
};

const fauna: Entity = {
  id: "2",
  slug: "loup-des-sables",
  type: "fauna",
  perimeter: "world",
  title: "Loup des sables",
  tags: [],
  fields: {
    pitch: "Prédateur des étendues arides.",
    statistics: {
      ac: 13,
      hp: { average: 22, formula: "4d8+4" },
      strength: 14,
    },
    public_description: "Un canidé massive au pelage ocre.",
  },
};

describe("CatalogSheet", () => {
  it("renders the pitch and descriptions as headed sections", () => {
    renderWithProviders(<CatalogSheet record={catalog} />);
    expect(screen.getByText("Pitch")).toBeDefined();
    expect(screen.getByText("Bretteur inspiré, magicien du verbe.")).toBeDefined();
    expect(screen.getByText("Public description")).toBeDefined();
  });

  it("omits the statistics block for plain catalogs", () => {
    renderWithProviders(<CatalogSheet record={catalog} />);
    expect(screen.queryByText("STR")).toBeNull();
  });

  it("embeds the statistics block for fauna and flora", () => {
    renderWithProviders(<CatalogSheet record={fauna} withStatistics />);
    expect(screen.getByText("AC")).toBeDefined();
    expect(screen.getByText("22 (4d8+4)")).toBeDefined();
    expect(screen.getByText("Pitch")).toBeDefined();
  });
});
