import { useEffect } from "react";
import { Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchMe, getWorldName, logout } from "../api/auth.js";
import { queryClient } from "../query-client.js";

const navItemClass = (active: boolean) =>
  `font-display text-xl px-3 py-1 rounded-md transition-colors duration-200 ${
    active
      ? "bg-accent text-background"
      : "text-background/75 hover:text-background"
  }`;

export function RootLayout() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isSetupOrLogin = pathname === "/setup" || pathname === "/login";

  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false });
  const user = me.data;

  // Tab title: white-labeled with the world name; record pages override
  // with their own title (RecordEditPage).
  useEffect(() => {
    if (!pathname.startsWith("/records/")) {
      document.title = getWorldName() ?? "DM Assistant";
    }
  }, [pathname, me.data]);

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

  // Record pages descend from Lore (world perimeter) or Campaigns
  // (campaign perimeter): keep the section highlighted using the cached
  // record. Unknown during load → no highlight.
  let recordPerimeter: string | null = null;
  const recordMatch = /^\/records\/([^/]+)$/.exec(pathname);
  if (recordMatch) {
    const cached = queryClient.getQueryData<{ perimeter: "world" | "campaign" }>([
      "record",
      decodeURIComponent(recordMatch[1]),
    ]);
    recordPerimeter = cached?.perimeter ?? null;
  }

  const loreActive =
    pathname === "/" ||
    (pathname.startsWith("/records/") && recordPerimeter !== "campaign");
  const campaignsActive =
    pathname.startsWith("/campaigns") ||
    (pathname.startsWith("/records/") && recordPerimeter === "campaign");

  return (
    <div className="min-h-screen">
      {isSetupOrLogin ? (
        <Outlet />
      ) : (
        <>
          <header className="sticky top-0 z-40 border-b border-[#1e211c] bg-[#2e332b]">
            <div className="mx-auto flex w-full max-w-[1100px] items-center gap-4 px-6 py-3">
              <Link to="/" className="font-display text-2xl font-semibold text-background">
                {getWorldName() ?? t("app.title")}
              </Link>
              <nav className="ml-4 flex items-center gap-2">
                <Link to="/" className={navItemClass(loreActive)}>
                  {t("nav.lore")}
                </Link>
                <Link to="/campaigns" className={navItemClass(campaignsActive)}>
                  {t("nav.campaigns")}
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin" className={navItemClass(pathname === "/admin")}>
                    {t("nav.admin")}
                  </Link>
                )}
              </nav>
              {user && (
                <div className="ml-auto flex items-center gap-3">
                  <Link to="/account" className="text-sm text-background/75 hover:text-background">
                    {user.displayName}
                  </Link>
                  <button
                    type="button"
                    onClick={() => void onLogout()}
                    className="text-sm text-background/75 hover:text-background"
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
