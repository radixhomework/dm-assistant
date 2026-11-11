vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => ({ to: vi.fn() }),
  useParams: () => ({ slug: "city-of-glass" }),
  useRouterState: () => ({
    select: () => ({ location: { pathname: "/login" } }),
  }),
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

import { describe, expect, it, vi, beforeAll } from "vitest";
import { screen } from "@testing-library/react";
import { LorePage } from "./LorePage";
import { renderWithProviders } from "../testing/render.js";

describe("LorePage", () => {
  beforeAll(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | RequestInfo, _init?: RequestInit) => {
        if (input === "/api/auth/me") {
          return {
            ok: true,
            json: async () => ({
              id: "1",
              email: "a@b.c",
              displayName: "DM",
              role: "admin",
            }),
          };
        }
        if (input === "/api/records?perimeter=world") {
          return {
            ok: true,
            json: async () => [
              {
                id: "1",
                slug: "city-of-glass",
                type: "places",
                perimeter: "world",
                title: "City of Glass",
                tags: [],
                fields: {},
                body: "",
              },
            ],
          };
        }
        return { ok: true, json: async () => [] };
      }),
    );
  });

  it("groups world records by template type", async () => {
    renderWithProviders(<LorePage />, "/");
    await vi.waitFor(() =>
      expect(screen.getByText("City of Glass")).toBeDefined(),
    );
    expect(screen.getByText("Places")).toBeDefined();
  });
});
