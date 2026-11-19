import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { PlaceSheet } from "./place-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const place: Entity = {
  id: "1",
  slug: "tremling",
  type: "places",
  perimeter: "world",
  title: "Tremling",
  tags: [],
  fields: {
    place_type: "city",
    population: "180 000",
    public_description: "A coastal city.",
  },
  references: {
    leaders: [{ slug: "the-mayor", title: "The Mayor" }],
  },
};

describe("PlaceSheet", () => {
  it.each([
    {
      name: "renders the place type and population as chips",
      assert: () => {
        expect(screen.getByText("City")).toBeDefined();
        expect(screen.getByText("180 000")).toBeDefined();
      },
    },
    {
      name: "renders the typed references as link groups",
      assert: () => {
        expect(screen.getByText("Leaders")).toBeDefined();
        expect(screen.getByText("The Mayor")).toBeDefined();
      },
    },
    {
      name: "renders the descriptions as headed frameless sections",
      assert: () => {
        expect(screen.getByText("Public description")).toBeDefined();
        expect(screen.getByText("A coastal city.")).toBeDefined();
      },
    },
  ])("$name", ({ assert }) => {
    renderWithProviders(<PlaceSheet record={place} />);
    assert();
  });
});
