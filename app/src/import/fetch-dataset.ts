import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpsRequest } from "node:https";
import type { IncomingMessage } from "node:http";
import { open5eEnvelopeSchema } from "@dm/schemas";
import { EndpointUnreachableError, UrlRefusedError } from "./import-errors.js";

/** Page cap on pagination following: a runaway dataset cannot walk the
 * whole remote site (srd-catalog-import decision 6). */
export const MAX_DATASET_PAGES = 20;

/**
 * The private/internal address ranges an SSRF guard refuses: IPv4
 * loopback, private, link-local, CGNAT and unspecified; IPv6 loopback,
 * ULA (fc00::/7) and link-local (fe80::/10).
 */
export function isPrivateAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }
  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (
      lower.startsWith("fe8") ||
      lower.startsWith("fe9") ||
      lower.startsWith("fea") ||
      lower.startsWith("feb")
    ) {
      return true;
    }
    return false;
  }
  return false;
}

/**
 * Refuses non-HTTPS origins and private/internal addresses: the fetch
 * is server-side on a self-hosted single-door instance — basic SSRF
 * hygiene for an admin-only endpoint. The host must resolve to public
 * addresses only (a literal private IP host is refused directly).
 */
export async function assertPublicHttpsUrl(
  raw: string,
): Promise<{ url: URL; address: string; family: 4 | 6 }> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UrlRefusedError(`'${raw}' is not a URL`);
  }
  if (url.protocol !== "https:") {
    throw new UrlRefusedError("only HTTPS URLs are fetched");
  }
  if (isPrivateAddress(url.hostname)) {
    throw new UrlRefusedError("private addresses are refused");
  }
  const addresses = await lookup(url.hostname, { all: true }).catch(
    () => null,
  );
  if (addresses === null || addresses.length === 0) {
    throw new UrlRefusedError(`'${url.hostname}' does not resolve`);
  }
  for (const { address } of addresses) {
    if (isPrivateAddress(address)) {
      throw new UrlRefusedError("private addresses are refused");
    }
  }
  const resolved = addresses[0];
  return { url, address: resolved.address, family: resolved.family as 4 | 6 };
}

export type DatasetResponse = { status: number | undefined; text: string };

/** One HTTPS GET through the address the guard validated: the custom
 * lookup pins that address, closing the rebinding window — the second
 * DNS resolution a plain fetch would perform cannot reroute the
 * connection to a private address. */
function pinnedGet(url: URL, address: string, family: 4 | 6): Promise<DatasetResponse> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      url,
      {
        lookup: (_hostname, options, callback) => {
          if (options.all) {
            callback(null, [{ address, family }]);
          } else {
            callback(null, address, family);
          }
        },
        headers: { accept: "application/json" },
      },
      (response: IncomingMessage) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () =>
          resolve({
            status: response.statusCode,
            text: Buffer.concat(chunks).toString("utf8"),
          }),
        );
      },
    );
    request.setTimeout(30000, () => request.destroy(new Error("timeout")));
    request.on("error", reject);
    request.end();
  });
}

/**
 * Fetches a dataset endpoint: reads the Open5e envelope (or a bare
 * array) and follows its `next` links — re-validated through the same
 * HTTPS/public guard — under the page cap.
 */
export type DatasetTransport = (
  url: URL,
  address: string,
  family: 4 | 6,
) => Promise<DatasetResponse>;

/** Fetches a dataset endpoint: every page runs through the HTTPS/public
 * guard and the pinned-address transport (the followed `next` links are
 * re-validated the same way) under the page cap. */
export async function fetchDataset(
  rawUrl: string,
  transport: DatasetTransport = pinnedGet,
): Promise<unknown[]> {
  const elements: unknown[] = [];
  let target: { url: URL; address: string; family: 4 | 6 } | null =
    await assertPublicHttpsUrl(rawUrl);
  for (let page = 0; target !== null && page < MAX_DATASET_PAGES; page += 1) {
    const { url, address, family } = target;
    const response = await transport(url, address, family).catch(() => null);
    if (response === null || !response.status || response.status >= 400) {
      throw new EndpointUnreachableError(
        `the endpoint '${url}' did not answer correctly`,
      );
    }
    let payload: unknown;
    try {
      payload = JSON.parse(response.text) as unknown;
    } catch {
      payload = null;
    }
    if (payload === null) {
      throw new EndpointUnreachableError("the endpoint sent an unreadable body");
    }
    elements.push(...extractElements(payload));
    const envelope = open5eEnvelopeSchema.safeParse(payload);
    const next = envelope.success ? envelope.data.next : undefined;
    target = next ? await assertPublicHttpsUrl(next) : null;
  }
  return elements;
}

/** A payload is either a bare array of elements or the Open5e
 * paginated envelope (`results[]` + `next`). */
export function extractElements(payload: unknown): unknown[] {
  const envelope = open5eEnvelopeSchema.safeParse(payload);
  if (envelope.success) {
    return envelope.data.results;
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  throw new EndpointUnreachableError(
    "the payload is neither a bare array nor an Open5e envelope",
  );
}
