import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
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
export async function assertPublicHttpsUrl(raw: string): Promise<URL> {
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
  return url;
}

/**
 * Fetches a dataset endpoint: reads the Open5e envelope (or a bare
 * array) and follows its `next` links — re-validated through the same
 * HTTPS/public guard — under the page cap.
 */
export async function fetchDataset(rawUrl: string): Promise<unknown[]> {
  const elements: unknown[] = [];
  let url: URL | null = await assertPublicHttpsUrl(rawUrl);
  for (let page = 0; url !== null && page < MAX_DATASET_PAGES; page += 1) {
    const response = await fetch(url).catch(() => null);
    if (response === null || !response.ok) {
      throw new EndpointUnreachableError(
        `the endpoint '${url}' did not answer correctly`,
      );
    }
    const payload = (await response.json().catch(() => null)) as unknown;
    if (payload === null) {
      throw new EndpointUnreachableError("the endpoint sent an unreadable body");
    }
    elements.push(...extractElements(payload));
    const envelope = open5eEnvelopeSchema.safeParse(payload);
    const next = envelope.success ? envelope.data.next : undefined;
    url = next ? await assertPublicHttpsUrl(next) : null;
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
