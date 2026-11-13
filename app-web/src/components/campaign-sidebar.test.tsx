import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { CampaignSidebar } from "./campaign-sidebar.js";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: (props: {
      params?: { slug?: string };
      className?: string;
      children?: React.ReactNode;
    }) => (
      <a className={props.className} href={`#${props.params?.slug ?? ""}`}>
        {props.children}
      </a>
    ),
  };
});

const campaign = {
  slug: "war-of-embers",
  type: "campaign",
  perimeter: "campaign" as const,
  title: "War of Embers",
  tracking: {
    slug: "war-of-embers",
    status: "not_played",
    children: [
      {
        slug: "chapter-one",
        title: "Chapter One",
        status: "in_progress",
        children: [
          { slug: "scene-one", title: "Scene One", status: "not_played" },
          { slug: "scene-two", title: "Scene Two", status: "played" },
        ],
      },
      { slug: "chapter-two", title: "Chapter Two", status: "not_played" },
    ],
  },
};

function stubCampaign() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input === "/api/records/war-of-embers") {
        return { ok: true, json: async () => campaign };
      }
      return { ok: true, status: 204, json: async () => ({}) };
    }),
  );
}

describe("CampaignSidebar", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    stubCampaign();
  });

  it("renders the campaign title and its chapter tree", async () => {
    renderWithProviders(
      <CampaignSidebar campaignSlug="war-of-embers" activeSlug={null} />,
    );
    await vi.waitFor(() =>
      expect(screen.getByText("War of Embers")).toBeDefined(),
    );
    expect(screen.getByText("Chapter One")).toBeDefined();
    expect(screen.getByText("Scene One")).toBeDefined();
    expect(screen.getByText("Chapter Two")).toBeDefined();
  });

  it("highlights the opened chapter or scene", async () => {
    renderWithProviders(
      <CampaignSidebar campaignSlug="war-of-embers" activeSlug="scene-one" />,
    );
    await vi.waitFor(() =>
      expect(screen.getByText("Scene One")).toBeDefined(),
    );
    const link = screen.getByText("Scene One").closest("a");
    expect(link?.className).toContain("bg-accent");
  });
});
