import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { GameRuleSheet } from "./game-rule-sheet.js";
import { renderWithProviders } from "../testing/render.js";
import type { Entity } from "../types.js";

const rule: Entity = {
  id: "1",
  slug: "rule-encumbrance",
  type: "game-rules",
  perimeter: "world",
  title: "Encombrement",
  tags: [],
  fields: {
    public_description: "Chaque personnage peut porter 10 x Force en livres.",
  },
};

describe("GameRuleSheet", () => {
  it("renders the rule text as a headed section", () => {
    renderWithProviders(<GameRuleSheet record={rule} />);
    expect(screen.getByText("Public description")).toBeDefined();
    expect(screen.getByText("Chaque personnage peut porter 10 x Force en livres.")).toBeDefined();
  });
  it("renders nothing else — no chips, no references", () => {
    renderWithProviders(<GameRuleSheet record={rule} />);
    expect(document.querySelectorAll("img, dl, .dice-node")).toHaveLength(0);
  });
});
