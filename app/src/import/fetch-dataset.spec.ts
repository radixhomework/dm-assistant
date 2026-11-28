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

  it("accepts a public HTTPS URL and resolves its address", async () => {
    const resolved = await assertPublicHttpsUrl("https://api.open5e.com/v2/conditions/");
    expect(resolved.url.hostname).toBe("api.open5e.com");
    expect(resolved.address.length).toBeGreaterThan(0);
    expect([4, 6]).toContain(resolved.family);
  });
});

describe("fetchDataset (envelope pagination)", () => {
  function envelope(results: unknown[], next: string | null) {
    return { count: results.length, next, previous: null, results };
  }

  it("follows the envelope's next links and accumulates the pages", async () => {
    const transport = vi.fn(async (url: URL) => {
      if (url.search.includes("page=2")) {
        return { status: 200, text: JSON.stringify(envelope([{ key: "b", name: "B", desc: "two" }], null)) };
      }
      return {
        status: 200,
        text: JSON.stringify(envelope([{ key: "a", name: "A", desc: "one" }], "https://api.open5e.com/v2/conditions/?page=2")),
      };
    });

    const elements = await fetchDataset("https://api.open5e.com/v2/conditions/", transport);
    expect(elements).toEqual([
      { key: "a", name: "A", desc: "one" },
      { key: "b", name: "B", desc: "two" },
    ]);
    expect(transport).toHaveBeenCalledTimes(2);
    // Every page targets the address the guard validated.
    expect(transport.mock.calls.every((call) => call[1] && call[2] === 4)).toBe(true);
  });

  it("stops at the page cap", async () => {
    const transport = vi.fn(async () => ({
      status: 200,
      text: JSON.stringify(envelope([{ key: "a", name: "A", desc: "x" }], "https://api.open5e.com/v2/conditions/?page=2")),
    }));

    const elements = await fetchDataset("https://api.open5e.com/v2/conditions/", transport);
    expect(elements).toHaveLength(MAX_DATASET_PAGES);
    expect(transport).toHaveBeenCalledTimes(MAX_DATASET_PAGES);
  });

  it("refuses a next link pointing at a private address", async () => {
    const transport = vi.fn(async () => ({
      status: 200,
      text: JSON.stringify(envelope([{ key: "a", name: "A", desc: "x" }], "https://127.0.0.1/next")),
    }));
    await expect(fetchDataset("https://api.open5e.com/v2/conditions/", transport)).rejects.toMatchObject({
      response: { code: "import_url_refused" },
    });
    // The refused page never reaches the transport.
    expect(transport).toHaveBeenCalledTimes(1);
  });

  it("refuses an endpoint answering non-OK", async () => {
    const transport = vi.fn(async () => ({ status: 500, text: "nope" }));
    await expect(fetchDataset("https://api.open5e.com/v2/conditions/", transport)).rejects.toMatchObject({
      response: { code: "import_endpoint_unreachable" },
    });
  });
});
