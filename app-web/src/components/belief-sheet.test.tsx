import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { BeliefSheet } from "./belief-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const belief: Entity = {
  id: "1",
  slug: "7-enfers",
  type: "beliefs-myths-and-customs",
  perimeter: "world",
  title: "7 Enfers",
  tags: [],
  fields: {
    follower_count: "Inconnu",
    public_description: "Les 7 enfers sont administrés par la déesse.",
  },
  references: {
    origin: [{ id: "id-osgwirond", slug: "osgwirond", title: "Osgwirond" }],
    events: [{ id: "id-event1", slug: "event1", title: "Début de la campagne" }],
    characters: [{ id: "id-gyorick-ducan", slug: "gyorick-ducan", title: "Gyorick Ducan" }],
    organizations: [{ id: "id-cercle-du-peridot", slug: "cercle-du-peridot", title: "Cercle du Péridot" }],
    beliefs: [{ id: "id-7-enfers", slug: "7-enfers", title: "7 Enfers" }],
  },
};

describe("BeliefSheet", () => {
  it("renders the follower count as a chip", () => {
    renderWithProviders(<BeliefSheet record={belief} />);
    const chip = screen
      .getByText("Follower count")
      .closest('span[class*="rounded-md"]');
    expect(chip?.textContent).toBe("Follower count Inconnu");
  });

  it("renders the origin as the structural reference", () => {
    renderWithProviders(<BeliefSheet record={belief} />);
    expect(screen.getByText("Origin")).toBeDefined();
    expect(screen.getByText("Osgwirond")).toBeDefined();
  });

  it("renders the associative references below the prose sections", () => {
    renderWithProviders(<BeliefSheet record={belief} />);
    const proseHeading = screen.getByText("Public description");
    const events = screen.getByText("Events");
    expect(
      proseHeading.compareDocumentPosition(events) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Gyorick Ducan")).toBeDefined();
    expect(screen.getByText("Cercle du Péridot")).toBeDefined();
  });

  it("renders the descriptions as headed frameless sections", () => {
    renderWithProviders(<BeliefSheet record={belief} />);
    expect(screen.getByText("Public description")).toBeDefined();
    expect(
      screen.getByText("Les 7 enfers sont administrés par la déesse."),
    ).toBeDefined();
  });
});
