import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch("/api/health");
  if (!res.ok) throw new Error("health check failed");
  return (await res.json()) as { status: string };
}

export function App() {
  const { t } = useTranslation();
  const health = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col justify-center px-6">
      <p className="font-display text-6xl font-semibold tracking-[-0.02em] text-ink">
        {t("app.title")}
      </p>
      <p className="mt-2 font-display text-2xl text-accent">
        {t("app.tagline")}
      </p>
      <p className="mt-8 max-w-[72ch] text-lg text-muted">{t("home.intro")}</p>
      <section className="mt-10 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-2xl font-semibold text-ink">
          {t("health.title")}
        </h2>
        <p className="mt-1 text-muted">
          {health.isPending
            ? t("health.loading")
            : health.isError
              ? t("health.error")
              : t("health.ok")}
        </p>
      </section>
    </main>
  );
}
