import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { WorkSheet } from "./work-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const work: Entity = {
  id: "1",
  slug: "qumquat",
  type: "works",
  perimeter: "world",
  title: "Qumquat",
  tags: [],
  fields: {
    public_description: "Livre de recette bien connu dans l'empire de Bunala.",
  },
  references: {
    origin: [{ id: "id-tremling", slug: "tremling", title: "Tremling" }],
    events: [{ id: "id-event1", slug: "event1", title: "Début de la campagne" }],
    characters: [{ id: "id-gyorick-ducan", slug: "gyorick-ducan", title: "Gyorick Ducan" }],
  },
};

describe("WorkSheet", () => {
  it("renders the place of origin as the structural reference", () => {
    renderWithProviders(<WorkSheet record={work} />);
    expect(screen.getByText("Origin")).toBeDefined();
    expect(screen.getByText("Tremling")).toBeDefined();
  });

  it("renders the associative references below the prose sections", () => {
    renderWithProviders(<WorkSheet record={work} />);
    const proseHeading = screen.getByText("Public description");
    const characters = screen.getByText("Characters");
    expect(
      proseHeading.compareDocumentPosition(characters) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Gyorick Ducan")).toBeDefined();
    expect(screen.getByText("Début de la campagne")).toBeDefined();
  });

  it("renders the descriptions as headed frameless sections", () => {
    renderWithProviders(<WorkSheet record={work} />);
    expect(screen.getByText("Public description")).toBeDefined();
    expect(
      screen.getByText("Livre de recette bien connu dans l'empire de Bunala."),
    ).toBeDefined();
  });
});
