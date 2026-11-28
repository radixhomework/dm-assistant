import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { AttributionPage } from "./AttributionPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  Link: (props: { children?: React.ReactNode; to?: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
  useNavigate: () => ({ to: vi.fn() }),
}));

describe("AttributionPage (srd-catalog-import spec)", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
        if (input === "/api/auth/me") {
          return {
            ok: true,
            json: async () => ({ id: "1", email: "a@b.c", displayName: "DM", role: "admin" }),
          };
        }
        if (input === "/api/sources") {
          return {
            ok: true,
            json: async () => [
              { id: "s0", name: "Internal", attribution: null, internal: true, disabled: false },
              {
                id: "s1",
                name: "Open5e (SRD 5.2)",
                attribution: "Imported from api.open5e.com",
                internal: false,
                disabled: true,
              },
            ],
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
  });

  it("credits Wizards of the Coast under the CC-BY-4.0 licence", async () => {
    renderWithProviders(<AttributionPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("Wizards of the Coast — SRD 5.2")).toBeDefined(),
    );
    expect(screen.getByText(/CC-BY-4\.0/)).toBeDefined();
  });

  it("lists the instance's external sources with their attribution notes", async () => {
    renderWithProviders(<AttributionPage />);
    await vi.waitFor(() =>
      expect(screen.getByText("Open5e (SRD 5.2)")).toBeDefined(),
    );
    expect(screen.getByText("Imported from api.open5e.com")).toBeDefined();
    // The Internal source is not an attribution entry.
    expect(screen.queryByText("Internal")).toBeNull();
  });
});
