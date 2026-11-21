import { useState } from "react";
import { Field, inputClass } from "../components/form.js";
import { formString } from "../forms.js";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { fetchBootstrapState } from "../api/auth.js";
import { queryClient } from "../query-client.js";

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

  async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formString(form, "username"),
          password: formString(form, "password"),
          displayName: formString(form, "displayName"),
          worldName: formString(form, "worldName"),
        }),
      });
      if (!res.ok) {
        setError(res.statusText);
        return;
      }
      // The router guard caches the bootstrap state: update it before
      // navigating, or the fresh instance would bounce back to /setup.
      queryClient.setQueryData(["bootstrap"], {
        adminExists: true,
        worldName: formString(form, "worldName"),
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
        <Field label={t("setup.username")}>
          <input name="username" required minLength={2} autoComplete="username" className={inputClass} />
        </Field>
        <Field label={t("setup.password")}>
          <input name="password" type="password" minLength={12} required className={inputClass} />
        </Field>
        <Field label={t("setup.displayName")}>
          <input name="displayName" required className={inputClass} />
        </Field>
        <Field label={t("setup.worldName")}>
          <input name="worldName" required className={inputClass} />
        </Field>
        {error && <p className="text-sm text-radish">{error}</p>}
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-background transition-colors duration-200 hover:bg-accent">
          {t("setup.submit")}
        </button>
      </form>
    </div>
  );
}
