import { useState } from "react";
import { formString } from "../forms.js";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { queryClient } from "../query-client.js";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        email: formString(form, "email"),
        password: formString(form, "password"),
      }),
    });
    if (res.ok) {
      // Refresh the cached auth state before navigating, so protected
      // pages see the session instead of bouncing back to /login.
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      void navigate({ to: "/" });
      return;
    }
    const payload = (await res.json().catch(() => null)) as { message?: string } | null;
    setError(payload?.message ?? res.statusText);
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">
        {t("login.title")}
      </h1>
      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("login.email")}
          <input name="email" type="email" required autoComplete="email" className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("login.password")}
          <input name="password" type="password" required autoComplete="current-password" className="rounded-md border border-border bg-background px-3 py-2" />
        </label>
        {error && <p className="text-sm text-radish">{error}</p>}
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-background transition-colors duration-200 hover:bg-accent">
          {t("login.submit")}
        </button>
      </form>
    </div>
  );
}
