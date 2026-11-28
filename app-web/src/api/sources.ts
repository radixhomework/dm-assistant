import { api } from "./client.js";

/** The provenance registry (srd-catalog-import capability): the seeded
 * Internal source plus the administrator-managed external sources. */

export type SourceView = {
  id: string;
  name: string;
  attribution: string | null;
  internal: boolean;
  disabled: boolean;
};

export function fetchSources(): Promise<SourceView[]> {
  return api<SourceView[]>("/api/sources");
}

export function createSource(input: {
  name: string;
  attribution?: string;
}): Promise<SourceView> {
  return api<SourceView>("/api/admin/sources", { method: "POST", body: input });
}

export function updateSource(
  id: string,
  input: { name?: string; attribution?: string | null; disabled?: boolean },
): Promise<SourceView> {
  return api<SourceView>(`/api/admin/sources/${id}`, {
    method: "PATCH",
    body: input,
  });
}

/** The import preview/confirm payloads (admin-only import tab). */
export type ImportPreviewItem = {
  slug: string;
  title: string;
  status: "new" | "overwrite" | "conflict" | "skipped";
  preChecked?: boolean;
  existingTitle?: string;
  existingSourceName?: string;
  reason?: string;
};

export type ImportPreview = { items: ImportPreviewItem[] };

export type ImportReport = {
  created: number;
  updated: number;
  skipped: Array<{ slug: string; title: string; reason: string }>;
};

async function postImport(
  action: "preview" | "confirm",
  args: {
    catalog: string;
    sourceId: string;
    document?: string;
    file?: File;
    url?: string;
    accepted?: string[];
  },
): Promise<unknown> {
  if (args.file) {
    const form = new FormData();
    form.append("file", args.file);
    form.append("catalog", args.catalog);
    form.append("sourceId", args.sourceId);
    if (args.document) form.append("document", args.document);
    if (action === "confirm" && args.accepted) {
      form.append("accepted", JSON.stringify(args.accepted));
    }
    // FormData posts as multipart/form-data: no Content-Type header —
    // the browser sets it with the boundary (the api wrapper defaults
    // to application/json, so fetch is used directly here).
    const response = await fetch(`/api/admin/catalogs/import/${action}`, {
      method: "POST",
      body: form,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; code?: string }
        | null;
      const { ApiError } = await import("./client.js");
      throw new ApiError(payload?.message ?? response.statusText, payload?.code);
    }
    return (await response.json()) as unknown;
  }
  return api<unknown>(`/api/admin/catalogs/import/${action}`, {
    method: "POST",
    body: {
      catalog: args.catalog,
      sourceId: args.sourceId,
      ...(args.document ? { document: args.document } : {}),
      ...(args.url ? { url: args.url } : {}),
      ...(action === "confirm" && args.accepted ? { accepted: args.accepted } : {}),
    },
  });
}

export function previewImport(args: Parameters<typeof postImport>[1]): Promise<ImportPreview> {
  return postImport("preview", args) as Promise<ImportPreview>;
}

export function confirmImport(args: Parameters<typeof postImport>[1]): Promise<ImportReport> {
  return postImport("confirm", args) as Promise<ImportReport>;
}

/** The source-scoped purge (srd-catalog-import): the sanctioned removal
 * channel for imported records. */
export type PurgeItem = { id: string; slug: string; title: string };

export type PurgeReport = {
  deleted: number;
  blocked: Array<{ slug: string; reason: string }>;
};

export function fetchPurgePreview(
  catalog: string,
  sourceId: string,
): Promise<PurgeItem[]> {
  return api<PurgeItem[]>(
    `/api/admin/catalogs/purge?catalog=${encodeURIComponent(catalog)}&sourceId=${encodeURIComponent(sourceId)}`,
  );
}

export function confirmPurge(
  catalog: string,
  sourceId: string,
  slugs: string[],
): Promise<PurgeReport> {
  return api<PurgeReport>("/api/admin/catalogs/purge", {
    method: "POST",
    body: { catalog, sourceId, slugs },
  });
}
