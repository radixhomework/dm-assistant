vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ slug: "city-of-glass" }),
  useRouterState: () => ({
    select: () => ({ location: { pathname: "/login" } }),
  }),
  Link: (props: { children?: React.ReactNode }) => <a>{props.children}</a>,
}));

import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { LoginPage } from "./LoginPage";
import { renderWithProviders } from "../testing/render.js";

describe("LoginPage", () => {
  it("renders the form labels in the active locale", () => {
    renderWithProviders(<LoginPage />, "/login");
    expect(screen.getAllByText("Log in").length).toBeGreaterThan(0);
    expect(screen.getByText("Username")).toBeDefined();
  });

  it("posts credentials to the login endpoint on submit", async () => {
    const fetchMock = vi.fn(async (_input: string | RequestInfo, _init?: RequestInit) => ({
      ok: true,
      json: async () => ({}),
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderWithProviders(<LoginPage />, "/login");
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    const identifier = form.querySelector('input[name="identifier"]');
    const password = form.querySelector('input[name="password"]');
    if (!identifier || !password) throw new Error("inputs missing");
    (identifier as HTMLInputElement).value = "dm";
    (password as HTMLInputElement).value = "a-long-enough-passphrase";
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/auth/login"),
    );
  });
});

describe("LoginPage errors", () => {
  it("shows the API error message on failed login", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        json: async () => ({ message: "This account is blocked" }),
      })),
    );
    renderWithProviders(<LoginPage />, "/login");
    const form = document.querySelector("form");
    if (!form) throw new Error("form missing");
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await vi.waitFor(() =>
      expect(screen.getByText(/This account is blocked/)).toBeDefined(),
    );
  });
});
