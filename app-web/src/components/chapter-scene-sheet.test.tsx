import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { ChapterSheet } from "./chapter-sheet.js";
import { SceneSheet } from "./scene-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
  };
});

const chapter: Entity = {
  id: "1",
  slug: "chap1",
  type: "chapter",
  perimeter: "campaign",
  title: "Chapitre 1 — Le port disparu",
  tags: [],
  fields: {
    dm_summary: "Les personnages arrivent à Tremling et découvrent le complot.",
    order: 0,
  },
  references: {
    campaign: [{ slug: "campagne-1", title: "Campagne 1" }],
  },
};

const scene: Entity = {
  id: "2",
  slug: "scene1-1",
  type: "scene",
  perimeter: "campaign",
  title: "Scène 1.1 — Accostage",
  tags: [],
  fields: {
    dm_summary: "Débarquement, première altercation.",
    running_notes: ":::attention\nLe contrebandier ment sur le manifeste.\n:::",
    play_status: "in_progress",
    order: 0,
  },
  references: {
    chapter: [{ slug: "chap1", title: "Chapitre 1 — Le port disparu" }],
  },
};

describe("ChapterSheet", () => {
  it("renders the DM summary and the parent campaign", () => {
    renderWithProviders(<ChapterSheet record={chapter} />);
    expect(screen.getByText("DM summary")).toBeDefined();
    expect(
      screen.getByText("Les personnages arrivent à Tremling et découvrent le complot."),
    ).toBeDefined();
    expect(screen.getByText("Campaign")).toBeDefined();
    expect(screen.getByText("Campagne 1")).toBeDefined();
  });
});

describe("SceneSheet", () => {
  it("renders the play status and order as translated chips", () => {
    renderWithProviders(<SceneSheet record={scene} />);
    const statusChip = screen
      .getByText("Play status")
      .closest('span[class*="rounded-md"]');
    expect(statusChip?.textContent).toBe("Play status In progress");
    const orderChip = screen
      .getByText("Order")
      .closest('span[class*="rounded-md"]');
    expect(orderChip?.textContent).toBe("Order 0");
  });

  it("renders the running notes as a prose section", () => {
    renderWithProviders(<SceneSheet record={scene} />);
    expect(screen.getByText("Running notes")).toBeDefined();
    // The typed block inside the notes renders with its color.
    expect(document.querySelector('[data-typed-block="attention"]')).not.toBeNull();
  });

  it("renders the parent chapter as the structural reference", () => {
    renderWithProviders(<SceneSheet record={scene} />);
    expect(screen.getByText("Chapter")).toBeDefined();
    expect(screen.getByText("Chapitre 1 — Le port disparu")).toBeDefined();
  });
});
