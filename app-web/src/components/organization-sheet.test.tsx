import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { OrganizationSheet } from "./organization-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const organization: Entity = {
  id: "1",
  slug: "cercle-du-peridot",
  type: "organizations",
  perimeter: "world",
  title: "Cercle du Péridot",
  tags: [],
  fields: {
    member_count: "~1000",
    public_description: "Groupement secret œuvrant dans l'ombre.",
  },
  references: {
    headquarters: [{ slug: "osgwirond", title: "Osgwirond" }],
    leaders: [{ slug: "soniata", title: "Soniata Elwim Hulma" }],
  },
};

describe("OrganizationSheet", () => {
  it("renders the member count as a chip", () => {
    renderWithProviders(<OrganizationSheet record={organization} />);
    expect(screen.getByText("~1000")).toBeDefined();
    expect(screen.getByText("Member count")).toBeDefined();
  });

  it("renders the typed references as link groups", () => {
    renderWithProviders(<OrganizationSheet record={organization} />);
    expect(screen.getByText("Headquarters")).toBeDefined();
    expect(screen.getByText("Osgwirond")).toBeDefined();
    expect(screen.getByText("Leaders")).toBeDefined();
    expect(screen.getByText("Soniata Elwim Hulma")).toBeDefined();
  });

  it("renders the descriptions as headed frameless sections", () => {
    renderWithProviders(<OrganizationSheet record={organization} />);
    expect(screen.getByText("Public description")).toBeDefined();
    expect(screen.getByText("Groupement secret œuvrant dans l'ombre.")).toBeDefined();
  });

  it("renders the illustration as a banner image when set", () => {
    const withImage: Entity = {
      ...organization,
      fields: { ...organization.fields, illustration: "/assets/banner.png" },
    };
    renderWithProviders(<OrganizationSheet record={withImage} />);
    const img = document.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("/assets/banner.png");
    expect(img?.getAttribute("alt")).toBe("Cercle du Péridot");
  });
});
