import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { KnowledgeSheet } from "./knowledge-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const knowledge: Entity = {
  id: "1",
  slug: "imprimerie",
  type: "knowledge-and-technologies",
  perimeter: "world",
  title: "Imprimerie",
  tags: [],
  fields: {
    public_description: "Procédé d'impression à caractères mobiles.",
  },
  references: {
    origin: [{ id: "id-tremling", slug: "tremling", title: "Tremling" }],
    events: [{ id: "id-event1", slug: "event1", title: "Début de la campagne" }],
    places: [{ id: "id-veldra", slug: "veldra", title: "Veldra" }],
    characters: [{ id: "id-gyorick-ducan", slug: "gyorick-ducan", title: "Gyorick Ducan" }],
    knowledge: [{ id: "id-imprimerie", slug: "imprimerie", title: "Imprimerie" }],
    nations: [{ id: "id-plenear", slug: "plenear", title: "Plenear" }],
    beliefs: [{ id: "id-7-enfers", slug: "7-enfers", title: "7 Enfers" }],
  },
};

describe("KnowledgeSheet", () => {
  it("renders the origin as the structural reference", () => {
    renderWithProviders(<KnowledgeSheet record={knowledge} />);
    expect(screen.getByText("Origin")).toBeDefined();
    expect(screen.getByText("Tremling")).toBeDefined();
  });

  it("renders the associative references below the prose sections", () => {
    renderWithProviders(<KnowledgeSheet record={knowledge} />);
    const proseHeading = screen.getByText("Public description");
    const events = screen.getByText("Events");
    expect(
      proseHeading.compareDocumentPosition(events) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Places")).toBeDefined();
    expect(screen.getByText("Knowledge")).toBeDefined();
    expect(screen.getByText("Nations")).toBeDefined();
    expect(screen.getByText("Beliefs")).toBeDefined();
  });

  it("renders the descriptions as headed frameless sections", () => {
    renderWithProviders(<KnowledgeSheet record={knowledge} />);
    expect(
      screen.getByText("Procédé d'impression à caractères mobiles."),
    ).toBeDefined();
  });
});
