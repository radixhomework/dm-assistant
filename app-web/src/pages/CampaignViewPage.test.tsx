import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { CampaignViewPage } from "./CampaignViewPage";
import { renderWithProviders } from "../testing/render.js";

vi.mock("@tanstack/react-router", () => ({
  useParams: () => ({ slug: "north-realm" }),
  useNavigate: () => ({ to: vi.fn() }),
}));

function mockInstance() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
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
      if (input === "/api/records/north-realm") {
        return {
          ok: true,
          json: async () => ({
            id: "1",
            slug: "north-realm",
            type: "campaign",
            perimeter: "campaign",
            title: "The North Realm",
            tags: [],
            fields: {},
            body: "",
            tracking: {
              slug: "north-realm",
              status: "not_played",
              children: [
                { slug: "chapter-one", title: "Chapter One", status: "not_played" },
              ],
            },
          }),
        };
      }
      if (input === "/api/records/chapter-one/tracking") {
        return {
          ok: true,
          json: async () => ({
            slug: "chapter-one",
            status: "not_played",
            children: [
              { slug: "scene-one", title: "Scene One", status: "not_played" },
            ],
          }),
        };
      }
      if (input === "/api/records/scene-one" && (!init || init.method !== "PATCH")) {
        return {
          ok: true,
          json: async () => ({
            id: "3",
            slug: "scene-one",
            type: "scene",
            perimeter: "campaign",
            title: "Scene One",
            tags: [],
            fields: {},
            body: "",
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    }),
  );
}

describe("CampaignViewPage", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    mockInstance();
  });

  it("renders chapters, scenes and status setters", async () => {
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() =>
      expect(screen.getByText("The North Realm")).toBeDefined(),
    );
    await vi.waitFor(() =>
      expect(screen.getByText("Chapter One")).toBeDefined(),
    );
    await vi.waitFor(() => expect(screen.getByText("Scene One")).toBeDefined());
    expect(screen.getAllByText("Not played").length).toBeGreaterThan(0);
  });
});

describe("CampaignViewPage scene creation", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    mockInstance();
  });

  it("creates a scene and attaches it to its chapter", async () => {
    const fetchMock = vi.fn(async (input: string, _init?: RequestInit) => {
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
      if (input === "/api/records/north-realm") {
        return {
          ok: true,
          json: async () => ({
            id: "1",
            slug: "north-realm",
            type: "campaign",
            perimeter: "campaign",
            title: "The North Realm",
            tags: [],
            fields: {},
            body: "",
            tracking: {
              slug: "north-realm",
              status: "not_played",
              children: [
                {
                  slug: "chapter-one",
                  title: "Chapter One",
                  status: "not_played",
                },
              ],
            },
          }),
        };
      }
      if (input === "/api/records/chapter-one/tracking") {
        return {
          ok: true,
          json: async () => ({
            slug: "chapter-one",
            status: "not_played",
            children: [],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() =>
      expect(screen.getByText("New scene")).toBeDefined(),
    );
    screen.getByText("New scene").click();
    await vi.waitFor(() => {
      const form = document.querySelector("form");
      expect(form).not.toBeNull();
    });
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    for (const [name, value] of [
      ["title", "Scene Two"],
      ["slug", "scene-two"],
    ] as Array<[string, string]>) {
      const field = form.querySelector(`input[name="${name}"]`);
      if (!field) throw new Error(`${name} missing`);
      (field as HTMLInputElement).value = value;
    }
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const created = calls.find(
        ([path, init]) => path === "/api/records" && init?.method === "POST",
      );
      const attached = calls.find(
        ([path, init]) =>
          path === "/api/records/scene-two/parent" && init?.method === "POST",
      );
      expect(created).toBeDefined();
      expect(attached).toBeDefined();
    });
  });
});

describe("CampaignViewPage deletions", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
    mockInstance();
  });

  function capturedFetch(): ReturnType<typeof vi.fn> {
    const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
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
      if (input === "/api/records/north-realm" && init?.method === "DELETE") {
        return { ok: true, status: 204 };
      }
      if (input === "/api/records/chapter-one" && init?.method === "DELETE") {
        return { ok: true, status: 204 };
      }
      if (input === "/api/records/scene-one" && init?.method === "DELETE") {
        return { ok: true, status: 204 };
      }
      if (input === "/api/records/north-realm") {
        return {
          ok: true,
          json: async () => ({
            id: "1",
            slug: "north-realm",
            type: "campaign",
            perimeter: "campaign",
            title: "The North Realm",
            tags: [],
            fields: {},
            body: "",
            tracking: {
              slug: "north-realm",
              status: "not_played",
              children: [
                { slug: "chapter-one", title: "Chapter One", status: "not_played" },
              ],
            },
          }),
        };
      }
      if (input === "/api/records/chapter-one/tracking") {
        return {
          ok: true,
          json: async () => ({
            slug: "chapter-one",
            status: "not_played",
            children: [
              { slug: "scene-one", title: "Scene One", status: "not_played" },
            ],
          }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("deletes a scene after confirmation", async () => {
    const fetchMock = capturedFetch();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() => expect(screen.getByText("Scene One")).toBeDefined());
    const sceneRow = screen.getByText("Scene One").closest("li");
    if (!sceneRow) throw new Error("scene row missing");
    const button = [...sceneRow.querySelectorAll("button")].find((b) => b.textContent === "Delete");
    if (!button) throw new Error("scene delete button missing");
    (button as HTMLElement).click();
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const removed = calls.find(([path, init]) => path === "/api/records/scene-one" && init?.method === "DELETE");
      expect(removed).toBeDefined();
    });
  });

  it("deletes a chapter after confirmation", async () => {
    const fetchMock = capturedFetch();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() => expect(screen.getByText("Chapter One")).toBeDefined());
    const card = screen.getByText("Chapter One").closest("li");
    if (!card) throw new Error("chapter card missing");
    const button = [...card.querySelectorAll(":scope > div button")].find((b) => b.textContent === "Delete") as HTMLElement | undefined;
    if (!button) throw new Error("chapter delete button missing");
    button.click();
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const removed = calls.find(([path, init]) => path === "/api/records/chapter-one" && init?.method === "DELETE");
      expect(removed).toBeDefined();
    });
  });

  it("deletes the campaign after confirmation", async () => {
    const fetchMock = capturedFetch();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() => expect(screen.getByText("Delete campaign")).toBeDefined());
    screen.getByText("Delete campaign").click();
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const removed = calls.find(([path, init]) => path === "/api/records/north-realm" && init?.method === "DELETE");
      expect(removed).toBeDefined();
    });
  });

  it("does not delete when confirmation is dismissed", async () => {
    const fetchMock = capturedFetch();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() => expect(screen.getByText("Delete campaign")).toBeDefined());
    screen.getByText("Delete campaign").click();
    await vi.waitFor(() => {
      const calls = fetchMock.mock.calls as Array<[string, RequestInit]>;
      const removed = calls.find(([path, init]) => path === "/api/records/north-realm" && init?.method === "DELETE");
      expect(removed).toBeUndefined();
    });
  });
});

describe("CampaignViewPage deletion refusal", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  it("surfaces the server refusal when a chapter still has scenes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init?: RequestInit) => {
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
        if (input === "/api/records/chapter-one" && init?.method === "DELETE") {
          return {
            ok: false,
            status: 409,
            json: async () => ({ message: "This record is a parent: remove its scenes first" }),
          };
        }
        if (input === "/api/records/north-realm") {
          return {
            ok: true,
            json: async () => ({
              id: "1",
              slug: "north-realm",
              type: "campaign",
              perimeter: "campaign",
              title: "The North Realm",
              tags: [],
              fields: {},
              body: "",
              tracking: {
                slug: "north-realm",
                status: "not_played",
                children: [
                  { slug: "chapter-one", title: "Chapter One", status: "not_played" },
                ],
              },
            }),
          };
        }
        if (input === "/api/records/chapter-one/tracking") {
          return {
            ok: true,
            json: async () => ({
              slug: "chapter-one",
              status: "not_played",
              children: [
                { slug: "scene-one", title: "Scene One", status: "not_played" },
              ],
            }),
          };
        }
        return { ok: true, json: async () => ({}) };
      }),
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProviders(<CampaignViewPage />, "/campaigns/north-realm");
    await vi.waitFor(() => expect(screen.getByText("Chapter One")).toBeDefined());
    const card = screen.getByText("Chapter One").closest("li");
    if (!card) throw new Error("chapter card missing");
    const button = [...card.querySelectorAll(":scope > div button")].find(
      (b) => b.textContent === "Delete",
    ) as HTMLElement | undefined;
    if (!button) throw new Error("chapter delete button missing");
    button.click();
    await vi.waitFor(() =>
      expect(screen.getByText(/remove its scenes first/i)).toBeDefined(),
    );
  });
});
