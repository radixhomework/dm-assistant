import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertPublicHttpsUrl,
  fetchDataset,
  isPrivateAddress,
  MAX_DATASET_PAGES,
} from "./fetch-dataset.js";

describe("isPrivateAddress (SSRF ranges)", () => {
  it("refuses the private, loopback, link-local, CGNAT and unspecified ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.1.2.3",
      "172.16.0.1",
      "172.31.255.255",
      "192.168.1.1",
      "169.254.10.10",
      "100.64.0.1",
      "0.0.0.0",
      "::1",
      "::",
      "fd00::1",
      "fe80::1",
    ]) {
      expect(isPrivateAddress(address), address).toBe(true);
    }
  });

  it("accepts public addresses", () => {
    for (const address of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700::1111"]) {
      expect(isPrivateAddress(address), address).toBe(false);
    }
  });

  it("does not crash on a non-IP string", () => {
    expect(isPrivateAddress("example.com")).toBe(false);
  });
});

describe("assertPublicHttpsUrl", () => {
  it("refuses non-HTTPS origins", async () => {
    await expect(assertPublicHttpsUrl("http://api.open5e.com/v2/conditions/"))
      .rejects.toMatchObject({ response: { code: "import_url_refused" } });
  });

  it("refuses a literal private address host", async () => {
    await expect(assertPublicHttpsUrl("https://127.0.0.1/dataset.json"))
      .rejects.toMatchObject({ response: { code: "import_url_refused" } });
    await expect(assertPublicHttpsUrl("https://[::1]/dataset.json"))
      .rejects.toMatchObject({ response: { code: "import_url_refused" } });
  });

  it("refuses an unresolvable host", async () => {
    await expect(assertPublicHttpsUrl("https://no-such-host.invalid/"))
      .rejects.toMatchObject({ response: { code: "import_url_refused" } });
  });

  it("accepts a public HTTPS URL", async () => {
    const url = await assertPublicHttpsUrl("https://api.open5e.com/v2/conditions/");
    expect(url.hostname).toBe("api.open5e.com");
  });
});

describe("fetchDataset (envelope pagination)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function envelope(results: unknown[], next: string | null) {
    return { count: results.length, next, previous: null, results };
  }

  it("follows the envelope's next links and accumulates the pages", async () => {
    const fetchMock = vi.fn(async (input: unknown) => {
      const url = String(input);
      if (url.includes("page=2")) {
        return new Response(JSON.stringify(envelope([{ key: "b", name: "B", desc: "two" }], null)), {
          status: 200,
        });
      }
      return new Response(
        JSON.stringify(envelope([{ key: "a", name: "A", desc: "one" }], "https://api.open5e.com/v2/conditions/?page=2")),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const elements = await fetchDataset("https://api.open5e.com/v2/conditions/");
    expect(elements).toEqual([
      { key: "a", name: "A", desc: "one" },
      { key: "b", name: "B", desc: "two" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops at the page cap", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify(envelope([{ key: "a", name: "A", desc: "x" }], "https://api.open5e.com/v2/conditions/?page=2")),
        { status: 200 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const elements = await fetchDataset("https://api.open5e.com/v2/conditions/");
    expect(elements).toHaveLength(MAX_DATASET_PAGES);
    expect(fetchMock).toHaveBeenCalledTimes(MAX_DATASET_PAGES);
  });

  it("refuses a next link pointing at a private address", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify(envelope([{ key: "a", name: "A", desc: "x" }], "https://127.0.0.1/next")),
          { status: 200 },
        ),
      ),
    );
    await expect(fetchDataset("https://api.open5e.com/v2/conditions/")).rejects.toMatchObject({
      response: { code: "import_url_refused" },
    });
  });

  it("refuses an endpoint answering non-OK", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    await expect(fetchDataset("https://api.open5e.com/v2/conditions/")).rejects.toMatchObject({
      response: { code: "import_endpoint_unreachable" },
    });
  });
});
