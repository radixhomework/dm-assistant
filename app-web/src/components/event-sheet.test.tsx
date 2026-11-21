import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { EventSheet } from "./event-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const event: Entity = {
  id: "1",
  slug: "event1",
  type: "events",
  perimeter: "world",
  title: "Début de la campagne du cercle du péridot",
  tags: [],
  fields: {
    start: { year: 3812, month: 1, day: 5 },
    end: { year: 3812, month: 1, day: 8 },
    recurrence: { unit: "month", interval: 3 },
    public_description: "Le vol du marteau de la famille Gulgram.",
  },
  references: {
    origin: [{ id: "id-miral", slug: "miral", title: "Miral" }],
    characters: [{ id: "id-gyorick-ducan", slug: "gyorick-ducan", title: "Gyorick Ducan" }],
  },
};

describe("EventSheet", () => {
  it("renders the start and end dates as a period chip", () => {
    renderWithProviders(<EventSheet record={event} />);
    // The chip spans two elements (muted label + value); without a
    // calendar definition the format interpolates the raw month number.
    const periodChip = screen
      .getByText("Period")
      .closest('span[class*="rounded-md"]');
    expect(periodChip?.textContent).toBe("Period 1 5, 3812 → 1 8, 3812");
  });

  it("renders the recurrence chip in the world unit", () => {
    renderWithProviders(<EventSheet record={event} />);
    const recurrenceChip = screen
      .getByText("Recurrence")
      .closest('span[class*="rounded-md"]');
    expect(recurrenceChip?.textContent).toBe("Recurrence every 3 months");
  });

  it("renders the origin as the structural reference", () => {
    renderWithProviders(<EventSheet record={event} />);
    expect(screen.getByText("Origin")).toBeDefined();
    expect(screen.getByText("Miral")).toBeDefined();
  });

  it("renders the associative references below the prose sections", () => {
    renderWithProviders(<EventSheet record={event} />);
    const proseHeading = screen.getByText("Public description");
    const characters = screen.getByText("Characters");
    expect(
      proseHeading.compareDocumentPosition(characters) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText("Gyorick Ducan")).toBeDefined();
  });
});
