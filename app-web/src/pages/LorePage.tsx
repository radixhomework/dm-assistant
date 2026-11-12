import { useQuery } from "@tanstack/react-query";
import { SlugTitleFields } from "../components/slug-fields.js";
import { Field, inputClass } from "../components/form.js";
import { formString } from "../forms.js";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useSlugAutoFill } from "../slug.js";


const categoryIcons: Record<string, LucideIcon> = {
  "characters-and-entities": Users,
  places: MapPin,
  organizations: Landmark,
  monsters: Skull,
  nations: Landmark,
  "natural-landmarks": Mountain,
  works: ScrollText,
  events: CalendarDays,
  "equipment-and-items": Sword,
  "beliefs-myths-and-customs": Sparkles,
  "knowledge-and-technologies": Lightbulb,
  "game-rules": Scale,
};import { useRequireAuth } from "./useRequireAuth.js";
import { worldTemplates, type Entity } from "../types.js";
import {
  CalendarDays,
  Skull,
  Landmark,
  Lightbulb,
  MapPin,
  Mountain,
  Scale,
  ScrollText,
  Sparkles,
  Sword,
  Users,
  type LucideIcon,
} from "lucide-react";

export function LorePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { ready } = useRequireAuth();
  const slugFields = useSlugAutoFill();
  const records = useQuery({
    queryKey: ["lore-records"],
    queryFn: () => api<Entity[]>("/api/records?perimeter=world"),
    enabled: ready,
    retry: false,
  });
  const [creating, setCreating] = useState(false);
  // Categories start collapsed; the set tracks the expanded ones.
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;
  if (records.isPending) return <p className="text-muted">{t("common.loading")}</p>;

  const list = records.data ?? [];
  const byType = new Map<string, Entity[]>();
  for (const record of list) {
    byType.set(record.type, [...(byType.get(record.type) ?? []), record]);
  }

  async function onCreate(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/records", {
        method: "POST",
        body: {
          slug: formString(form, "slug"),
          type: formString(form, "type"),
          perimeter: "world",
          title: formString(form, "title"),
        },
      });
      setCreating(false);
      slugFields.reset();
      await records.refetch();
      // Straight into editing the freshly created record.
      void navigate({
        to: "/records/$slug",
        params: { slug: formString(form, "slug") },
        search: { edit: "1" },
      });
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-4xl font-semibold text-ink">
          {t("lore.title")}
        </h1>
        <button
          type="button"
          onClick={() => {
            if (!creating) slugFields.reset();
            setCreating((value) => !value);
          }}
          className="rounded-md bg-primary px-4 py-2 text-sm text-background transition-colors duration-200 hover:bg-accent"
        >
          {t("lore.newRecord")}
        </button>
      </div>
      <p className="mt-2 text-muted">{t("lore.intro")}</p>

      {creating && (
        <form onSubmit={onCreate} className="mt-6 flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4">
          <Field label={t("lore.type")}>
            <select name="type" className={inputClass}>
              {worldTemplates.map((template) => (
                <option key={template} value={template}>
                  {t(`lore.categories.${template}`)}
                </option>
              ))}
            </select>
          </Field>
          <SlugTitleFields fields={slugFields} />
          {error && <p className="text-sm text-radish">{error}</p>}
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
            {t("lore.create")}
          </button>
        </form>
      )}

      {list.length === 0 && <p className="mt-8 text-muted">{t("lore.empty")}</p>}

      {worldTemplates.map((type) => {
        const typeRecords = byType.get(type) ?? [];
        if (typeRecords.length === 0) return null;
        const Icon = categoryIcons[type];
        const isCollapsed = !expanded.has(type);
        return (
          <section key={type} className="mt-6">
            <button
              type="button"
              aria-expanded={!isCollapsed}
              onClick={() =>
                setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(type)) next.delete(type);
                  else next.add(type);
                  return next;
                })
              }
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-left transition-colors duration-200 hover:bg-surface"
            >
              {Icon && <Icon className="size-5 text-accent" aria-hidden />}
              <h2 className="font-display text-2xl font-semibold text-ink">
                {t(`lore.categories.${type}`)}
              </h2>
              <span className="text-sm text-muted">({typeRecords.length})</span>
              <span className="ml-auto text-sm text-muted">{isCollapsed ? "▸" : "▾"}</span>
            </button>
            {!isCollapsed && (
              <ul className="mt-2 flex flex-col gap-1">
                {typeRecords.map((record) => (
                  <li key={record.slug} className="flex items-baseline justify-between rounded-md border border-border bg-surface px-4 py-2">
                    <span className="text-ink">{record.title}</span>
                    <Link
                      to="/records/$slug"
                      params={{ slug: record.slug }}
                      className="text-sm text-accent hover:underline"
                    >
                      {t("lore.open")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
