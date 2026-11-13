import { useQuery } from "@tanstack/react-query";
import { Field, inputClass } from "../components/form.js";
import { formString } from "../forms.js";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../api/client.js";
import { adminDeleteUser, adminResetPassword } from "../api/auth.js";
import { CalendarAdminEditor } from "../components/calendar-admin-editor.js";
import { useRequireAuth } from "./useRequireAuth.js";
import type { SafeUserLike } from "../types.js";

export function AdminPage() {
  const { t } = useTranslation();
  const { ready, user } = useRequireAuth();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [creating, setCreating] = useState(false);
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetSaved, setResetSaved] = useState(false);

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
        distanceUnit: string | null;
        weightUnit: string | null;
        volumeUnit: string | null;
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
          username: formString(form, "username"),
          email: formString(form, "email"),
          password: formString(form, "password"),
          displayName: formString(form, "displayName"),
          role: String(formString(form, "role") || "dm"),
        },
      });
      setCreating(false);
      await users.refetch();
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  async function onResetPassword(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResetSaved(false);
    const form = new FormData(event.currentTarget);
    const id = formString(form, "id");
    try {
      await adminResetPassword(id, formString(form, "newPassword"));
      setResetFor(null);
      setResetSaved(true);
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  async function onDeleteUser(id: string) {
    setError(null);
    try {
      await adminDeleteUser(id);
      await users.refetch();
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : String(deleteError);
      if (message.includes("still has campaigns")) setError(t("admin.userHasCampaigns"));
      else if (message.includes("your own account")) setError(t("admin.selfDelete"));
      else setError(message);
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
          distanceUnit: formString(form, "distanceUnit"),
          weightUnit: formString(form, "weightUnit"),
          volumeUnit: formString(form, "volumeUnit"),
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
            <Field label={t("admin.username")}>
              <input name="username" required minLength={2} className={inputClass} />
            </Field>
            <Field label={t("admin.email")}>
              <input name="email" type="email" required className={inputClass} />
            </Field>
            <Field label={t("admin.password")}>
              <input name="password" type="password" minLength={12} required className={inputClass} />
            </Field>
            <Field label={t("admin.displayName")}>
              <input name="displayName" required className={inputClass} />
            </Field>
            <Field label={t("admin.role")}>
              <select name="role" className={inputClass}>
                <option value="dm">dm</option>
                <option value="admin">admin</option>
              </select>
            </Field>
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
              <button
                type="button"
                onClick={() => { setResetFor(resetFor === account.id ? null : account.id); setResetSaved(false); }}
                className="rounded-md border border-border px-3 py-1 text-sm text-muted hover:bg-background"
              >
                {t("admin.resetPassword")}
              </button>              <button
                type="button"
                onClick={() => {
                  if (confirm(t("admin.deleteUserConfirm"))) void onDeleteUser(account.id);
                }}
                className="rounded-md border border-border px-3 py-1 text-sm text-radish hover:bg-background"
              >
                {t("admin.deleteUser")}
              </button>
              {resetFor === account.id && (
                <form onSubmit={onResetPassword} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="id" value={account.id} />
                  <Field label={t("admin.newPassword")}>
                    <input name="newPassword" type="password" required minLength={12} className={inputClass} />
                  </Field>
                  <button type="submit" className="self-start rounded-md bg-primary px-3 py-1 text-sm text-background hover:bg-accent">
                    {t("admin.resetPassword")}
                  </button>
                  {resetSaved && <p className="text-sm text-primary">{t("admin.passwordReset")}</p>}
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("admin.settings")}
        </h2>
        {settings.data === undefined ? (
          <p className="mt-4 text-sm text-muted">{t("common.loading")}</p>
        ) : (
        <form onSubmit={onSaveSettings} className="mt-4 flex max-w-md flex-col gap-3">

          <Field label={t("admin.distanceUnit")}>
            <select name="distanceUnit" defaultValue={settings.data?.distanceUnit ?? "m"} className={inputClass}>
              <option value="m">m</option>
              <option value="ft">ft</option>
            </select>
          </Field>
          <Field label={t("admin.weightUnit")}>
            <select name="weightUnit" defaultValue={settings.data?.weightUnit ?? "kg"} className={inputClass}>
              <option value="kg">kg</option>
              <option value="lb">lb</option>
            </select>
          </Field>
          <Field label={t("admin.volumeUnit")}>
            <select name="volumeUnit" defaultValue={settings.data?.volumeUnit ?? "L"} className={inputClass}>
              <option value="L">L</option>
              <option value="gal">gal</option>
            </select>
          </Field>
          <button type="submit" className="self-start rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent">
            {t("admin.save")}
          </button>
          {saved && <p className="text-sm text-primary">{t("admin.saved")}</p>}
        </form>
        )}
      </section>
      <CalendarAdminEditor />
    </div>
  );
}
