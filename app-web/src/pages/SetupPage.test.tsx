import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { SetupPage } from "./SetupPage";
import { renderWithProviders } from "../testing/render.js";

describe("SetupPage", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ adminExists: false }),
      })),
    );
  });

  it("renders the wizard form", () => {
    renderWithProviders(<SetupPage />, "/setup");
    expect(screen.getByText("Welcome to your instance")).toBeDefined();
    expect(screen.getByText("Create the administrator")).toBeDefined();
  });
});
