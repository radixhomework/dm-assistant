import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api, ApiError } from "../../api/client.js";
import { inputClass } from "../form.js";
import { loreRoute } from "../../urls.js";
import type { Entity } from "../../types.js";
import type { TagInventoryEntry } from "../../api/search.js";

/**
 * The consultative Tags tab with its two instance-wide management
 * actions (record-tags capability): rename rewrites every record
 * carrying the tag, merge absorbs it into a target — one transaction
 * each, the touched-record count reported. Deletion without replacement
 * stays the per-record edit, not an admin action.
 */
export function TagsAdminTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [merging, setMerging] = useState<string | null>(null);

  const tags = useQuery({
    queryKey: ["tags"],
    queryFn: () => api<TagInventoryEntry[]>("/api/tags"),
  });
  const records = useQuery({
    queryKey: ["records-all"],
    queryFn: () => api<Entity[]>("/api/records"),
  });

  function translateError(code: string | undefined, fallback: string): string {
    if (code) return t(`errors.${code}`, { defaultValue: fallback });
    return fallback;
  }

  function invalidate(): Promise<void> {
    return queryClient.invalidateQueries({ queryKey: ["tags"] }).then(() =>
      queryClient.invalidateQueries({ queryKey: ["records-all"] }),
    ).then(() => undefined);
  }

  async function runAction(action: () => Promise<{ renamed?: number; merged?: number }>): Promise<void> {
    setBusy(true);
    setError(null);
    setReport(null);
    try {
      const result = await action();
      const count = result.renamed ?? result.merged ?? 0;
      setReport(t("admin.tags.touchedReport", { count }));
      await invalidate();
    } catch (actionError) {
      const code = actionError instanceof ApiError ? actionError.code : undefined;
      setError(translateError(code, actionError instanceof Error ? actionError.message : String(actionError)));
    } finally {
      setBusy(false);
    }
  }

  async function onRename(from: string, to: string): Promise<void> {
    await runAction(async () => {
      const result = await api<{ renamed: number }>("/api/admin/tags/rename", {
        method: "POST",
        body: { from, to },
      });
      setRenaming(null);
      return result;
    });
  }

  async function onMerge(from: string, into: string): Promise<void> {
    await runAction(async () => {
      const result = await api<{ merged: number }>("/api/admin/tags/merge", {
        method: "POST",
        body: { from, into },
      });
      setMerging(null);
      return result;
    });
  }

  const recordsByTag = new Map<string, Entity[]>();
  for (const record of records.data ?? []) {
    for (const tag of record.tags) {
      const list = recordsByTag.get(tag) ?? [];
      list.push(record);
      recordsByTag.set(tag, list);
    }
  }

  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-ink">
        {t("admin.tags.title")}
      </h2>
      {report && <p className="mt-3 text-sm text-primary">{report}</p>}
      {error && <p className="mt-3 text-sm text-radish">{error}</p>}
      {(tags.data ?? []).length === 0 ? (
        <p className="mt-4 text-muted">{t("admin.tags.empty")}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {(tags.data ?? []).map((entry) => {
            const carriers = recordsByTag.get(entry.tag) ?? [];
            return (
              <li
                key={entry.tag}
                className="rounded-md border border-border bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-ink">
                    {entry.tag}{" "}
                    <span className="text-sm text-muted">
                      {t("admin.tags.count", { count: entry.count })}
                    </span>
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => { setRenaming(entry.tag); setMerging(null); }}
                      className="rounded-md border border-border px-3 py-1 text-sm text-ink hover:bg-background disabled:opacity-50"
                    >
                      {t("admin.tags.rename")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => { setMerging(entry.tag); setRenaming(null); }}
                      className="rounded-md border border-border px-3 py-1 text-sm text-ink hover:bg-background disabled:opacity-50"
                    >
                      {t("admin.tags.merge")}
                    </button>
                  </span>
                </div>
                {carriers.length > 0 && (
                  <p className="mt-1 text-sm text-muted">
                    {carriers.map((record, index) => (
                      <span key={record.id}>
                        {index > 0 && ", "}
                        <Link
                          to={loreRoute(record.id).to}
                          params={loreRoute(record.id).params}
                          className="text-accent hover:underline"
                        >
                          {record.title}
                        </Link>
                      </span>
                    ))}
                  </p>
                )}
                {renaming === entry.tag && (
                  <form
                    className="mt-2 flex items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const input = new FormData(event.currentTarget);
                      void onRename(entry.tag, String(input.get("to") ?? ""));
                    }}
                  >
                    <label className="flex flex-col gap-1 text-sm">
                      {t("admin.tags.newName")}
                      <input name="to" required defaultValue={entry.tag} className={inputClass} />
                    </label>
                    <button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-2 text-sm text-background hover:bg-accent disabled:opacity-50">
                      {t("admin.tags.renameConfirm")}
                    </button>
                    <button type="button" onClick={() => setRenaming(null)} className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-background">
                      {t("common.cancel")}
                    </button>
                  </form>
                )}
                {merging === entry.tag && (
                  <form
                    className="mt-2 flex items-end gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const input = new FormData(event.currentTarget);
                      const into = String(input.get("into") ?? "");
                      if (into !== "" && confirm(t("admin.tags.mergeConfirm", { from: entry.tag, into }))) {
                        void onMerge(entry.tag, into);
                      }
                    }}
                  >
                    <label className="flex flex-col gap-1 text-sm">
                      {t("admin.tags.mergeInto")}
                      <select name="into" required className={inputClass}>
                        {(tags.data ?? [])
                          .filter((other) => other.tag !== entry.tag)
                          .map((other) => (
                            <option key={other.tag} value={other.tag}>
                              {other.tag}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button type="submit" disabled={busy} className="rounded-md bg-primary px-3 py-2 text-sm text-background hover:bg-accent disabled:opacity-50">
                      {t("admin.tags.mergeConfirmAction")}
                    </button>
                    <button type="button" onClick={() => setMerging(null)} className="rounded-md border border-border px-3 py-2 text-sm text-muted hover:bg-background">
                      {t("common.cancel")}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
