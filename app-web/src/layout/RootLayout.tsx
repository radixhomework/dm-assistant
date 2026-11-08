import { Outlet, Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchMe } from "../api/auth.js";
import { api } from "../api/client.js";

const navItemClass = (active: boolean) =>
  `font-display text-xl px-3 py-1 rounded-md transition-colors duration-200 ${
    active
      ? "bg-primary text-background"
      : "text-ink hover:text-accent"
  }`;

export function RootLayout() {
  const { t } = useTranslation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSetupOrLogin = pathname === "/setup" || pathname === "/login";

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false });
  const user = me.data;

  return (
    <div className="min-h-screen">
      {isSetupOrLogin ? (
        <Outlet />
      ) : (
        <>
          <header className="border-b border-border bg-surface">
            <div className="mx-auto flex w-full max-w-[1100px] items-center gap-4 px-6 py-3">
              <Link to="/" className="font-display text-2xl font-semibold text-ink">
                {t("app.title")}
              </Link>
              <nav className="ml-4 flex items-center gap-2">
                <Link to="/" className={navItemClass(pathname === "/")}>
                  {t("nav.lore")}
                </Link>
                <Link
                  to="/campaigns"
                  className={navItemClass(pathname.startsWith("/campaigns"))}
                >
                  {t("nav.campaigns")}
                </Link>
                {user?.role === "admin" && (
                  <Link
                    to="/admin"
                    className={navItemClass(pathname === "/admin")}
                  >
                    {t("nav.admin")}
                  </Link>
                )}
              </nav>
              {user && (
                <button
                  type="button"
                  onClick={() => void api("/api/auth/logout", { method: "POST" })}
                  className="ml-auto text-sm text-muted hover:text-accent"
                >
                  {t("nav.logout")}
                </button>
              )}
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1100px] px-6 py-8">
            <Outlet />
          </main>
        </>
      )}
    </div>
  );
}
