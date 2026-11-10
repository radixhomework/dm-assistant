import { useQuery } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { Entity } from "../types.js";

export function RecordEditPage() {
  const { t } = useTranslation();
  const { slug } = useParams({ from: "/records/$slug" });
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const record = useQuery({
    queryKey: ["record", slug],
    queryFn: () => api<Entity>(`/api/records/${slug}`),
    enabled: ready,
    retry: false,
  });

  if (!ready) return null;
  if (record.isPending)
    return <p className="text-muted">{t("common.loading")}</p>;
  if (record.isError || !record.data)
    return <p className="text-radish">{t("common.error")}</p>;

  const data = record.data;
  const fieldsJson = JSON.stringify(data.fields, null, 2);

  async function onSave(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    let fields: unknown;
    try {
      fields = JSON.parse(formString(form, "fields") || "{}");
    } catch {
      setError("Invalid JSON");
      return;
    }
    try {
      await api(`/api/records/${slug}`, {
        method: "PATCH",
        body: {
          title: formString(form, "title"),
          tags: formString(form, "tags")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          fields,
          body: formString(form, "body"),
        },
      });
      setSaved(true);
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  async function onDelete() {
    setError(null);
    try {
      await api(`/api/records/${slug}`, { method: "DELETE" });
      void navigate({ to: "/" });
    } catch (deleteError) {
      setError(String(deleteError));
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {data.title}
      </h1>
      <p className="mt-1 text-sm text-muted">{data.type}</p>
      <form onSubmit={onSave} className="mt-6 flex max-w-2xl flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("common.fields.title")}
          <input name="title" defaultValue={data.title} className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("lore.tags")}
          <input name="tags" defaultValue={data.tags.join(", ")} className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("lore.fields")}
          <textarea name="fields" rows={8} defaultValue={fieldsJson} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("lore.body")}
          <textarea name="body" rows={10} defaultValue={data.body} className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        {saved && <p className="text-sm text-primary">{t("lore.saved")}</p>}
        {error && <p className="text-sm text-radish">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
            {t("lore.save")}
          </button>
          <button type="button" onClick={() => void onDelete()} className="rounded-md border border-border px-4 py-2 text-sm text-radish hover:bg-surface">
            {t("lore.delete")}
          </button>
        </div>
      </form>
    </div>
  );
}
