import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import i18n from "./i18n";

afterEach(cleanup);

describe("App shell", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: "ok" }),
      })),
    );
    document.documentElement.lang = "en";
    void i18n.changeLanguage("en");
  });

  it("renders the shell in English and reports the API as online", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );
    expect(screen.getByText("DM Assistant")).toBeDefined();
    expect(screen.getByText("API status")).toBeDefined();
    await waitFor(() => expect(screen.getByText("Online")).toBeDefined());
    expect(document.documentElement.lang).toBe("en");
  });

  it("renders in French when the locale is fr", async () => {
    await i18n.changeLanguage("fr");
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );
    expect(screen.getByText("État de l'API")).toBeDefined();
    await waitFor(() => expect(screen.getByText(/En ligne/)).toBeDefined());
    expect(document.documentElement.lang).toBe("fr");
  });

  it("names the recovery when the API is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByText(/check that the app server is running/),
      ).toBeDefined(),
    );
  });
});
