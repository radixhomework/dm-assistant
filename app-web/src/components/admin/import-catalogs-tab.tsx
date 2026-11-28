import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client.js";
import {
  confirmImport,
  createSource,
  previewImport,
  type ImportPreviewItem,
} from "../../api/sources.js";
import { Field, inputClass } from "../form.js";
import { catalogTemplates, type CatalogTemplate } from "../../types.js";
import { fetchSources, type SourceView } from "../../api/sources.js";

/**
 * The Import catalogs tab (srd-catalog-import capability): an explicit
 * human action — the administrator selects the target catalog and the
 * external source, chooses the origin (uploaded JSON file or endpoint
 * URL), runs the preview and confirms the accepted set. Confirming a
 * cross-source overwrite rebinds provenance; the report lists what was
 * created, updated and skipped.
 */
export function ImportCatalogsTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<CatalogTemplate>("classes");
  const [sourceId, setSourceId] = useState<string>("");
  const [document, setDocument] = useState("srd-2024");
  const [origin, setOrigin] = useState<"file" | "url">("file");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [items, setItems] = useState<ImportPreviewItem[] | null>(null);
  const [accepted, setAccepted] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceAttribution, setSourceAttribution] = useState("");
  const [creatingSource, setCreatingSource] = useState(false);

  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });

  const selectable = (sources.data ?? []).filter(
    (source: SourceView) => !source.internal && !source.disabled,
  );
  const skippedCount = (items ?? []).filter((item) => item.status === "skipped").length;

  function translateError(code: string | undefined, fallback: string): string {
    if (code) return t(`errors.${code}`, { defaultValue: fallback });
    return fallback;
  }

  async function onPreview(): Promise<void> {
    setRunning(true);
    setReport(null);
    setError(null);
    try {
      const preview = await previewImport({
        catalog,
        sourceId,
        ...(document.trim() !== "" ? { document: document.trim() } : {}),
        ...(origin === "file"
          ? { file: file ?? undefined }
          : { url: url.trim() }),
      });
      setItems(preview.items);
      setAccepted(new Set(
        preview.items
          .filter((item) => item.preChecked === true)
          .map((item) => item.slug),
      ));
    } catch (previewError) {
      const code = previewError instanceof ApiError ? previewError.code : undefined;
      setError(translateError(code, previewError instanceof Error ? previewError.message : String(previewError)));
    } finally {
      setRunning(false);
    }
  }

  async function onConfirm(): Promise<void> {
    setRunning(true);
    setError(null);
    try {
      const result = await confirmImport({
        catalog,
        sourceId,
        ...(document.trim() !== "" ? { document: document.trim() } : {}),
        ...(origin === "file"
          ? { file: file ?? undefined }
          : { url: url.trim() }),
        accepted: [...accepted],
      });
      const skipped = result.skipped.length > 0
        ? " " + t("admin.import.reportSkipped", { count: result.skipped.length })
        : "";
      setReport(
        t("admin.import.report", {
          created: result.created,
          updated: result.updated,
        }) + skipped,
      );
      setItems(null);
      setAccepted(new Set());
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ["records-all"] });
    } catch (confirmError) {
      const code = confirmError instanceof ApiError ? confirmError.code : undefined;
      setError(translateError(code, confirmError instanceof Error ? confirmError.message : String(confirmError)));
    } finally {
      setRunning(false);
    }
  }

  async function onCreateSource(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      const created = await createSource({
        name: sourceName.trim(),
        ...(sourceAttribution.trim() !== "" ? { attribution: sourceAttribution.trim() } : {}),
      });
      setCreatingSource(false);
      setSourceName("");
      setSourceAttribution("");
      await queryClient.invalidateQueries({ queryKey: ["sources"] });
      setSourceId(created.id);
    } catch (sourceError) {
      const code = sourceError instanceof ApiError ? sourceError.code : undefined;
      setError(translateError(code, sourceError instanceof Error ? sourceError.message : String(sourceError)));
    }
  }

  function toggle(slug: string): void {
    setAccepted((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function selectAll(): void {
    setAccepted((current) => {
      const selectableSlugs = (items ?? [])
        .filter((item) => item.status === "overwrite" || item.status === "conflict")
        .map((item) => item.slug);
      const everythingSelected = selectableSlugs.every((slug) => current.has(slug));
      return everythingSelected ? new Set<string>() : new Set(selectableSlugs);
    });
  }

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t("admin.import.title")}
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-muted">{t("admin.import.hint")}</p>
      {error && <p className="mt-3 text-sm text-radish">{error}</p>}
      {report && <p className="mt-3 text-sm text-primary">{report}</p>}

      <form
        className="mt-4 flex max-w-3xl flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onPreview();
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={t("admin.import.catalog")}>
            <select
              value={catalog}
              onChange={(event) => setCatalog(event.target.value as CatalogTemplate)}
              className={inputClass}
            >
              {catalogTemplates.map((type) => (
                <option key={type} value={type}>
                  {t(`lore.categories.${type}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("admin.import.source")}>
            <select
              value={sourceId}
              onChange={(event) => setSourceId(event.target.value)}
              className={inputClass}
            >
              <option value="">
                {t("admin.import.chooseSource")}
              </option>
              {selectable.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <legend className="px-1 text-sm text-muted">{t("admin.import.origin")}</legend>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="origin"
                checked={origin === "file"}
                onChange={() => setOrigin("file")}
              />
              {t("admin.import.originFile")}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="origin"
                checked={origin === "url"}
                onChange={() => setOrigin("url")}
              />
              {t("admin.import.originUrl")}
            </label>
          </div>
          {origin === "file" ? (
            <input
              type="file"
              accept="application/json,.json"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="text-sm"
              aria-label={t("admin.import.originFile")}
            />
          ) : (
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://api.open5e.com/v2/conditions/"
              className={inputClass}
              aria-label={t("admin.import.originUrl")}
            />
          )}
          <Field label={t("admin.import.document")}>
            <input
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              className={inputClass}
            />
          </Field>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={running || sourceId === "" || (origin === "file" ? file === null : url.trim() === "")}
            className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("admin.import.preview")}
          </button>
          <button
            type="button"
            disabled={running}
            onClick={() => setCreatingSource((value) => !value)}
            className="rounded-md border border-border px-3 py-1.5 text-sm text-muted hover:bg-background"
          >
            {t("admin.import.newSource")}
          </button>
        </div>

        {creatingSource && (
          <form onSubmit={onCreateSource} className="flex max-w-md flex-col gap-3 rounded-md border border-border bg-surface p-3">
            <Field label={t("admin.import.sourceName")}>
              <input
                value={sourceName}
                onChange={(event) => setSourceName(event.target.value)}
                required
                className={inputClass}
              />
            </Field>
            <Field label={t("admin.import.sourceAttribution")}>
              <input
                value={sourceAttribution}
                onChange={(event) => setSourceAttribution(event.target.value)}
                className={inputClass}
              />
            </Field>
            <button type="submit" className="self-start rounded-md bg-primary px-3 py-1.5 text-sm text-background hover:bg-accent">
              {t("admin.import.sourceCreate")}
            </button>
          </form>
        )}
      </form>

      {items !== null && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <h3 className="font-display text-xl text-ink">{t("admin.import.previewTitle")}</h3>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={
                  (items ?? []).some((item) => item.status === "overwrite" || item.status === "conflict") &&
                  (items ?? []).every(
                    (item) =>
                      item.status === "new" ||
                      item.status === "skipped" ||
                      accepted.has(item.slug),
                  )
                }
                onChange={selectAll}
                aria-label={t("admin.import.selectAll")}
              />
              {t("admin.import.selectAll")}
            </label>
          </div>
          <ul className="mt-3 flex flex-col gap-1">
            {items.map((item, index) => (
              <li
                key={`${item.slug}-${index}`}
                className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm"
              >
                <span>
                  <span className="text-ink">{item.title || item.slug || t("admin.import.invalidElement")}</span>
                  {item.existingTitle && item.existingTitle !== item.title && (
                    <span className="text-muted"> — {item.existingTitle}</span>
                  )}
                  {item.existingSourceName && (
                    <span className="text-muted"> · {item.existingSourceName}</span>
                  )}
                </span>
                <span className="flex items-center gap-3">
                  {item.status === "skipped" ? (
                    <span className="text-radish">{t(`admin.import.reason.${item.reason ?? "invalid"}`)}</span>
                    ) : (
                    <>
                      <span className="text-muted">{t(`admin.import.status.${item.status}`)}</span>
                      {(item.status === "overwrite" || item.status === "conflict") && (
                        <input
                          type="checkbox"
                          checked={accepted.has(item.slug)}
                          onChange={() => toggle(item.slug)}
                          aria-label={t("admin.import.acceptOf", { title: item.title })}
                        />
                      )}
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
          {skippedCount > 0 && (
            <p className="mt-2 text-sm text-muted">
              {t("admin.import.skippedCount", { count: skippedCount })}
            </p>
          )}
          <button
            type="button"
            disabled={running || accepted.size === 0 && !items.some((item) => item.status === "new")}
            onClick={() => void onConfirm()}
            className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("admin.import.confirm")}
          </button>
        </div>
      )}
    </section>
  );
}
