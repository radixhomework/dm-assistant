import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { ReferenceInput } from "./reference-input.js";
import { renderWithProviders } from "../testing/render.js";

describe("ReferenceInput", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input.startsWith("/api/records?q=city")) {
          return {
            ok: true,
            json: async () => [
              { slug: "city-of-glass", title: "City of Glass" },
              { slug: "city-of-iron", title: "City of Iron" },
            ],
          };
        }
        return { ok: true, status: 204, json: async () => ({}) };
      }),
    );
  });

  it("suggests target-template records and picks one", async () => {
    const onPick = vi.fn();
    renderWithProviders(
      <ReferenceInput targetType="places" placeholder="Search" onPick={onPick} />,
    );
    const input = screen.getByPlaceholderText("Search");
    fireEvent.input(input, { target: { value: "city" } });
    await vi.waitFor(() => expect(screen.getAllByText("City of Glass").length).toBeGreaterThan(0));
    fireEvent.click(screen.getByText("City of Glass"));
    expect(onPick).toHaveBeenCalledWith("city-of-glass", "City of Glass");
    // The input clears after picking.
    expect((input as HTMLInputElement).value).toBe("");
  });
});
