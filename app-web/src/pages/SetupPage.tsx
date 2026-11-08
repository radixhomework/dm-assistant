import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { fetchBootstrapState } from "../api/auth.js";

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const state = useQuery({
    queryKey: ["bootstrap"],
    queryFn: fetchBootstrapState,
  });
  const [error, setError] = useState<string | null>(null);

  if (!state.isPending && state.data?.adminExists) {
    void navigate({ to: "/login" });
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email")),
          password: String(form.get("password")),
          displayName: String(form.get("displayName")),
          worldName: String(form.get("worldName")),
          contentLanguage: String(form.get("contentLanguage")),
        }),
      });
      void navigate({ to: "/login" });
    } catch (submitError) {
      setError(String(submitError));
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col justify-center px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("setup.title")}
      </h1>
      <p className="mt-2 text-muted">{t("setup.intro")}</p>
      <form onSubmit={onSubmit} className="mt-8 flex max-w-md flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("setup.email")}
          <input name="email" type="email" required className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("setup.password")}
          <input name="password" type="password" minLength={12} required className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("setup.displayName")}
          <input name="displayName" required className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("setup.worldName")}
          <input name="worldName" required className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("setup.contentLanguage")}
          <select name="contentLanguage" className="rounded-md border border-border bg-background px-3 py-2">
            <option value="en">en</option>
            <option value="fr">fr</option>
          </select>
        </label>
        {error && <p className="text-sm text-radish">{error}</p>}
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-background transition-colors duration-200 hover:bg-accent">
          {t("setup.submit")}
        </button>
      </form>
    </div>
  );
}
