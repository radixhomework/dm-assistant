import { useQuery } from "@tanstack/react-query";
import { formString } from "../forms.js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { SafeUserLike } from "../types.js";

export function AdminPage() {
  const { t } = useTranslation();
  const { ready, user } = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api<SafeUserLike[]>("/api/admin/users"),
    enabled: ready,
    retry: false,
  });
  const settings = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () =>
      api<{
        worldName: string | null;
        contentLanguage: string | null;
        distanceUnit: string | null;
        weightUnit: string | null;
      }>("/api/admin/settings"),
    enabled: ready,
    retry: false,
  });

  if (!ready) return null;
  if (user?.role !== "admin") {
    return <p className="text-radish">{t("admin.title")}</p>;
  }

  async function onCreateUser(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: {
          email: formString(form, "email"),
          password: formString(form, "password"),
          displayName: formString(form, "displayName"),
          role: String(form.get("role") || "dm"),
        },
      });
      setCreating(false);
      await users.refetch();
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  async function onSetStatus(id: string, status: "active" | "blocked") {
    setError(null);
    try {
      await api(`/api/admin/users/${id}/status`, {
        method: "PATCH",
        body: { status },
      });
      await users.refetch();
    } catch (statusError) {
      setError(String(statusError));
    }
  }

  async function onSaveSettings(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/admin/settings", {
        method: "PATCH",
        body: {
          contentLanguage: formString(form, "contentLanguage"),
          distanceUnit: formString(form, "distanceUnit"),
          weightUnit: formString(form, "weightUnit"),
        },
      });
      setSaved(true);
      await settings.refetch();
    } catch (saveError) {
      setError(String(saveError));
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("admin.title")}
      </h1>

      <section className="mt-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {t("admin.users")}
          </h2>
          <button
            type="button"
            onClick={() => setCreating((value) => !value)}
            className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent"
          >
            {t("admin.createUser")}
          </button>
        </div>

        {error && <p className="text-sm text-radish">{error}</p>}
        {creating && (
          <form
            onSubmit={onCreateUser}
            className="mt-4 flex max-w-md flex-col gap-3 rounded-lg border border-border bg-surface p-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              {t("admin.email")}
              <input name="email" type="email" required className="rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("admin.password")}
              <input name="password" type="password" minLength={12} required className="rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("admin.displayName")}
              <input name="displayName" required className="rounded-md border border-border bg-background px-3 py-2" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t("admin.role")}
              <select name="role" className="rounded-md border border-border bg-background px-3 py-2">
                <option value="dm">dm</option>
                <option value="admin">admin</option>
              </select>
            </label>
            <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
              {t("admin.create")}
            </button>
          </form>
        )}

        <ul className="mt-4 flex flex-col gap-1">
          {(users.data ?? []).map((account) => (
            <li
              key={account.id}
              className="flex items-baseline justify-between rounded-md border border-border bg-surface px-4 py-2"
            >
              <span>
                <span className="text-ink">{account.displayName}</span>{" "}
                <span className="text-sm text-muted">
                  {account.email} · {account.role} · {account.status}
                </span>
              </span>
              {account.status === "active" ? (
                <button
                  type="button"
                  onClick={() => void onSetStatus(account.id, "blocked")}
                  className="rounded-md border border-border px-3 py-1 text-sm text-radish hover:bg-background"
                >
                  {t("admin.block")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onSetStatus(account.id, "active")}
                  className="rounded-md border border-border px-3 py-1 text-sm text-primary hover:bg-background"
                >
                  {t("admin.unblock")}
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("admin.settings")}
        </h2>
        <form onSubmit={onSaveSettings} className="mt-4 flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t("admin.contentLanguage")}
            <select name="contentLanguage" defaultValue={settings.data?.contentLanguage ?? "en"} className="rounded-md border border-border bg-background px-3 py-2">
              <option value="en">en</option>
              <option value="fr">fr</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("admin.distanceUnit")}
            <input name="distanceUnit" defaultValue={settings.data?.distanceUnit ?? "m"} className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("admin.weightUnit")}
            <input name="weightUnit" defaultValue={settings.data?.weightUnit ?? "kg"} className="rounded-md border border-border bg-background px-3 py-2" />
          </label>
          <button type="submit" className="self-start rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
            {t("admin.save")}
          </button>
          {saved && <p className="text-sm text-primary">{t("admin.saved")}</p>}
        </form>
      </section>
    </div>
  );
}
