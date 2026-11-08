import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formString } from "../forms.js";
import { useRequireAuth } from "./useRequireAuth.js";
import { changeMyPassword, updateProfile } from "../api/auth.js";
import { queryClient } from "../query-client.js";

export function AccountPage() {
  const { t } = useTranslation();
  const { ready, user } = useRequireAuth();
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);

  if (!ready) return null;

  async function onSaveProfile(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      const updated = await updateProfile({
        email: formString(form, "email"),
        displayName: formString(form, "displayName"),
        uiLocale: formString(form, "uiLocale") as "en" | "fr",
      });
      queryClient.setQueryData(["me"], updated);
      setProfileSaved(true);
    } catch (submitError) {
      setProfileError(String(submitError));
    }
  }

  async function onChangePassword(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      await changeMyPassword(
        formString(form, "currentPassword"),
        formString(form, "newPassword"),
      );
      setPasswordSaved(true);
    } catch (submitError) {
      setPasswordError(String(submitError));
    }
  }

  return (
    <div>
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("account.title")}
      </h1>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("account.profileSection")}
        </h2>
        <form onSubmit={onSaveProfile} className="mt-4 flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t("account.email")}
            <input
              name="email"
              type="email"
              required
              defaultValue={user?.email ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("account.displayName")}
            <input
              name="displayName"
              required
              defaultValue={user?.displayName ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("account.uiLanguage")}
            <select
              name="uiLocale"
              defaultValue={user?.uiLocale ?? ""}
              className="rounded-md border border-border bg-background px-3 py-2"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent"
          >
            {t("account.saveProfile")}
          </button>
          {profileSaved && <p className="text-sm text-primary">{t("account.saved")}</p>}
          {profileError && <p className="text-sm text-radish">{profileError}</p>}
        </form>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("account.passwordSection")}
        </h2>
        <form onSubmit={onChangePassword} className="mt-4 flex max-w-md flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            {t("account.currentPassword")}
            <input
              name="currentPassword"
              type="password"
              required
              autoComplete="current-password"
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("account.newPassword")}
            <input
              name="newPassword"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              className="rounded-md border border-border bg-background px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm text-background hover:bg-accent"
          >
            {t("account.changePassword")}
          </button>
          {passwordSaved && <p className="text-sm text-primary">{t("account.passwordChanged")}</p>}
          {passwordError && <p className="text-sm text-radish">{passwordError}</p>}
        </form>
      </section>
    </div>
  );
}
