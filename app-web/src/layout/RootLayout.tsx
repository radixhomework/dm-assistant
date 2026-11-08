import { useEffect } from "react";
import { Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchMe, logout, updateProfile } from "../api/auth.js";
import { queryClient } from "../query-client.js";

const navItemClass = (active: boolean) =>
  `font-display text-xl px-3 py-1 rounded-md transition-colors duration-200 ${
    active
      ? "bg-primary text-background"
      : "text-ink hover:text-accent"
  }`;

const languageClass = (active: boolean) =>
  `rounded-md px-2 py-0.5 text-sm transition-colors duration-200 ${
    active
      ? "bg-primary text-background"
      : "text-muted hover:text-accent"
  }`;

export function RootLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSetupOrLogin = pathname === "/setup" || pathname === "/login";

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false });
  const user = me.data;

  // Apply the account's UI language at load (null = instance default).
  useEffect(() => {
    const locale = me.data?.uiLocale;
    if (locale && i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [me.data?.uiLocale, i18n]);

  async function onLogout() {
    await logout();
    void navigate({ to: "/login" });
  }

  function onSwitchLanguage(next: "en" | "fr") {
    if (i18n.language === next) return;
    void i18n.changeLanguage(next);
    if (user) {
      // Persist on the account; keep the session local if it fails.
      void updateProfile({ uiLocale: next })
        .then((updated) => queryClient.setQueryData(["me"], updated))
        .catch(() => undefined);
    }
  }

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
                <div className="ml-auto flex items-center gap-3">
                  <div className="flex items-center gap-1" role="group" aria-label="UI language">
                    <button
                      type="button"
                      onClick={() => onSwitchLanguage("en")}
                      className={languageClass(i18n.language === "en")}
                    >
                      EN
                    </button>
                    <button
                      type="button"
                      onClick={() => onSwitchLanguage("fr")}
                      className={languageClass(i18n.language === "fr")}
                    >
                      FR
                    </button>
                  </div>
                  <Link
                    to="/account"
                    className="text-sm text-muted hover:text-accent"
                  >
                    {user.displayName}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    className="text-sm text-muted hover:text-accent"
                  >
                    {t("nav.logout")}
                  </button>
                </div>
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
