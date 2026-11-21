import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { NaturalLandmarkSheet } from "./natural-landmark-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const landmark: Entity = {
  id: "1",
  slug: "hauts-plateaux-de-mylna",
  type: "natural-landmarks",
  perimeter: "world",
  title: "Hauts plateaux de Mÿlna",
  tags: [],
  fields: {
    public_description: "Plateaux balayés par les vents.",
  },
  references: {
    nations: [{ id: "id-plenear", slug: "plenear", title: "Plenear" }],
  },
};

describe("NaturalLandmarkSheet", () => {
  it("renders the associated nations as the structural reference", () => {
    renderWithProviders(<NaturalLandmarkSheet record={landmark} />);
    expect(screen.getByText("Nations")).toBeDefined();
    expect(screen.getByText("Plenear")).toBeDefined();
  });

  it("renders the descriptions as headed frameless sections", () => {
    renderWithProviders(<NaturalLandmarkSheet record={landmark} />);
    expect(screen.getByText("Public description")).toBeDefined();
    expect(screen.getByText("Plateaux balayés par les vents.")).toBeDefined();
  });

  it("renders the illustration as a banner image when set", () => {
    const withImage: Entity = {
      ...landmark,
      fields: { ...landmark.fields, illustration: "/assets/plateaux.png" },
    };
    renderWithProviders(<NaturalLandmarkSheet record={withImage} />);
    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("/assets/plateaux.png");
  });
});
