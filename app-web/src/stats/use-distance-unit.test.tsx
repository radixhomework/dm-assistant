import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDistanceUnit } from "./use-distance-unit.js";

describe("useDistanceUnit", () => {
  beforeEach(() => {
    document.documentElement.lang = "en";
  });

  it("keeps the cached unit after a failed refetch", async () => {
    // TanStack Query keeps the cached data after a failed refetch but
    // clears the success flag: the label must follow the data, not the
    // flag, or unchanged values flip from "30 ft" to "30 m".
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ message: "boom" }) })),
    );
    const cacheEntry = client
      .getQueryCache()
      .build(client, client.defaultQueryOptions({ queryKey: ["display-settings"] }));
    cacheEntry.setState({
      data: { distanceUnit: "ft" },
      dataUpdateCount: 1,
      status: "error",
      error: new Error("boom"),
    });
    const { result } = renderHook(() => useDistanceUnit(), {
      wrapper: ({ children }: { children?: ReactNode }) =>
        createElement(QueryClientProvider, { client }, children),
    });
    // Data is present and the status is error: the cached unit wins.
    await vi.waitFor(() => expect(result.current).toBe("ft"));
    // The mount retry settles in error again; the unit still follows the
    // retained data.
    await vi.waitFor(() =>
      expect(client.getQueryState(["display-settings"])?.fetchStatus).toBe("idle"),
    );
    expect(result.current).toBe("ft");
  });
});
