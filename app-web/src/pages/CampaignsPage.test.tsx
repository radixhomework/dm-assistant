import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { CampaignsPage } from "./CampaignsPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => ({ to: vi.fn() }),
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

const listResponse = () => ({
  ok: true,
  json: async () => [
    {
      id: "1",
      slug: "north-realm",
      type: "campaign",
      perimeter: "campaign",
      title: "The North Realm",
      tags: [],
      fields: {},
      body: "",
    },
  ],
});

describe("CampaignsPage", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string) => {
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
        if (input === "/api/records?perimeter=campaign&type=campaign") {
          return listResponse();
        }
        if (input === "/api/records/north-realm/tracking") {
          return {
            ok: true,
            json: async () => ({ slug: "north-realm", status: "in_progress" }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
  });

  it("lists campaigns with their play status", async () => {
    renderWithProviders(<CampaignsPage />, "/campaigns");
    await vi.waitFor(() =>
      expect(screen.getByText("The North Realm")).toBeDefined(),
    );
    expect(screen.getByText("In progress")).toBeDefined();
  });
});
