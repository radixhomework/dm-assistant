import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "../../api/client.js";
import {
  confirmImport,
  confirmPurge,
  createSource,
  fetchPurgePreview,
  fetchSources,
  previewImport,
  type ImportPreviewItem,
  type PurgeItem,
  type SourceView,
} from "../../api/sources.js";
import { Dialog } from "../dialog.js";
import { Field, inputClass } from "../form.js";
import { catalogTemplates, type CatalogTemplate } from "../../types.js";

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
  // The source-scoped purge: a separate selection from the import's —
  // disabled sources participate (a retired import's data still leaves).
  const [purgeCatalog, setPurgeCatalog] = useState<CatalogTemplate>("conditions");
  const [purgeSourceId, setPurgeSourceId] = useState("");
  const [purgeItems, setPurgeItems] = useState<PurgeItem[] | null>(null);
  const [purgeAccepted, setPurgeAccepted] = useState<Set<string>>(new Set());
  const [purgeReport, setPurgeReport] = useState<string | null>(null);
  const [purgeError, setPurgeError] = useState<string | null>(null);

  const sources = useQuery({
    queryKey: ["sources"],
    queryFn: fetchSources,
  });

  const selectable = (sources.data ?? []).filter(
    (source: SourceView) => !source.internal && !source.disabled,
  );
  const purgeable = (sources.data ?? []).filter(
    (source: SourceView) => !source.internal,
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

  async function onPurgeList(): Promise<void> {
    setPurgeError(null);
    setPurgeReport(null);
    try {
      const items = await fetchPurgePreview(purgeCatalog, purgeSourceId);
      setPurgeItems(items);
      setPurgeAccepted(new Set(items.map((item) => item.slug)));
    } catch (listError) {
      const code = listError instanceof ApiError ? listError.code : undefined;
      setPurgeError(translateError(code, listError instanceof Error ? listError.message : String(listError)));
    }
  }

  async function onPurgeConfirm(): Promise<void> {
    if (purgeAccepted.size === 0) return;
    if (!confirm(t("admin.import.purgeDeleteConfirm", {
      count: purgeAccepted.size,
      source: purgeable.find((source) => source.id === purgeSourceId)?.name ?? "",
    }))) {
      return;
    }
    setPurgeError(null);
    try {
      const result = await confirmPurge(purgeCatalog, purgeSourceId, [...purgeAccepted]);
      const blocked = result.blocked.length > 0
        ? " " + t("admin.import.purgeBlocked", { count: result.blocked.length })
        : "";
      setPurgeReport(t("admin.import.purgeReport", { deleted: result.deleted }) + blocked);
      setPurgeItems(null);
      setPurgeAccepted(new Set());
      await queryClient.invalidateQueries({ queryKey: ["records-all"] });
    } catch (purgeConfirmError) {
      const code = purgeConfirmError instanceof ApiError ? purgeConfirmError.code : undefined;
      setPurgeError(translateError(code, purgeConfirmError instanceof Error ? purgeConfirmError.message : String(purgeConfirmError)));
    }
  }

  function purgeToggle(slug: string): void {
    setPurgeAccepted((current) => {
      const next = new Set(current);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }

  function purgeSelectAll(): void {
    setPurgeAccepted((current) => {
      const all = (purgeItems ?? []).map((item) => item.slug);
      const everythingSelected = all.every((slug) => current.has(slug));
      return everythingSelected ? new Set<string>() : new Set(all);
    });
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
    <>
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
            <div className="flex items-center gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-border px-3 py-1.5 text-sm text-ink transition-colors duration-200 hover:bg-background focus-within:outline focus-within:outline-2 focus-within:outline-accent">
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  className="sr-only"
                  aria-label={t("admin.import.chooseFile")}
                />
                {file ? t("admin.import.chooseAnotherFile") : t("admin.import.chooseFile")}
              </label>
              <span className="text-sm text-muted">
                {file?.name ?? t("admin.import.noFile")}
              </span>
            </div>
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
          <Field label={t("admin.import.srdVersion")}>
            <select
              value={document}
              onChange={(event) => setDocument(event.target.value)}
              className={inputClass}
            >
              <option value="srd-2024">{t("admin.import.srd2024")}</option>
              <option value="srd-2014">{t("admin.import.srd2014")}</option>
            </select>
            <p className="text-xs text-muted">{t("admin.import.documentHint")}</p>
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
      </form>

      {creatingSource && (
        <Dialog
          title={t("admin.import.newSource")}
          onClose={() => {
            setCreatingSource(false);
            setSourceName("");
            setSourceAttribution("");
          }}
        >
          <form onSubmit={onCreateSource} className="flex flex-col gap-3">
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
              <p className="text-xs text-muted">{t("admin.import.sourceAttributionHint")}</p>
            </Field>
            <button type="submit" className="self-start rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
              {t("admin.import.sourceCreate")}
            </button>
          </form>
        </Dialog>
      )}

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

      <section className="mt-10 border-t border-border pt-6">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("admin.import.purgeTitle")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t("admin.import.purgeHint")}</p>
        {purgeError && <p className="mt-3 text-sm text-radish">{purgeError}</p>}
        {purgeReport && <p className="mt-3 text-sm text-primary">{purgeReport}</p>}

        <div className="mt-4 flex max-w-3xl flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={t("admin.import.purgeCatalog")}>
              <select
                value={purgeCatalog}
                onChange={(event) => setPurgeCatalog(event.target.value as CatalogTemplate)}
                className={inputClass}
              >
                {catalogTemplates.map((type) => (
                  <option key={type} value={type}>
                    {t(`lore.categories.${type}`)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("admin.import.purgeSource")}>
              <select
                value={purgeSourceId}
                onChange={(event) => setPurgeSourceId(event.target.value)}
                className={inputClass}
              >
                <option value="">{t("admin.import.chooseSource")}</option>
                {purgeable.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}{source.disabled ? ` (${t("admin.import.purgeDisabled")})` : ""}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <button
            type="button"
            disabled={running || purgeSourceId === ""}
            onClick={() => void onPurgeList()}
            className="self-start rounded-md border border-border px-4 py-2 text-sm text-ink hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t("admin.import.purgeList")}
          </button>

          {purgeItems !== null && (
            purgeItems.length === 0 ? (
              <p className="text-sm text-muted">{t("admin.import.purgeEmpty")}</p>
            ) : (
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-xl text-ink">{t("admin.import.purgeListTitle")}</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={(purgeItems ?? []).every((item) => purgeAccepted.has(item.slug))}
                      onChange={purgeSelectAll}
                      aria-label={t("admin.import.selectAll")}
                    />
                    {t("admin.import.selectAll")}
                  </label>
                </div>
                <ul className="mt-3 flex flex-col gap-1">
                  {purgeItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between rounded-md border border-border bg-surface px-4 py-2 text-sm"
                    >
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={purgeAccepted.has(item.slug)}
                          onChange={() => purgeToggle(item.slug)}
                          aria-label={t("admin.import.purgeAcceptOf", { title: item.title })}
                        />
                        <span className="text-ink">{item.title}</span>
                        <span className="text-muted">· {item.slug}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={running || purgeAccepted.size === 0}
                  onClick={() => void onPurgeConfirm()}
                  className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("admin.import.purgeDelete")}
                </button>
              </div>
            )
          )}
        </div>
      </section>
    </>
  );
}
