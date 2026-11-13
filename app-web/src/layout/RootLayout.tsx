import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Menu, X } from "lucide-react";
import { AppSidebar } from "../components/app-sidebar.js";
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
  // Narrow screens: the sidebar overlays as a drawer, dismissed on
  // toggle, backdrop tap or navigation.
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  // Navigation dismisses the narrow-screen drawer.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
            <div className="mx-auto flex w-full max-w-[1200px] items-center gap-4 px-6 py-3">
              {user && (
                <button
                  type="button"
                  aria-label={t("nav.sidebar")}
                  aria-expanded={sidebarOpen}
                  onClick={() => setSidebarOpen((open) => !open)}
                  className="rounded-md p-1.5 text-background/75 transition-colors duration-200 hover:bg-[#1e211c] hover:text-background md:hidden"
                >
                  <Menu className="size-5" aria-hidden />
                </button>
              )}
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
          <div className="mx-auto flex w-full max-w-[1200px] items-start">
            <aside
              className={`${
                sidebarOpen
                  ? "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-surface shadow-xl"
                  : "hidden"
              } md:static md:z-auto md:block md:w-[260px] md:shrink-0 md:border-r md:border-border`}
            >
              <div className="flex items-center justify-end px-2 pt-3 md:hidden">
                <button
                  type="button"
                  aria-label={t("common.close")}
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md p-1.5 text-muted transition-colors duration-200 hover:bg-surface hover:text-ink"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-1 pb-4">
                <AppSidebar />
              </div>
            </aside>
            {sidebarOpen && (
              <div
                aria-hidden
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 z-40 bg-black/40 md:hidden"
              />
            )}
            <main className="min-w-0 flex-1 px-6 py-8">
              <Outlet />
            </main>
          </div>
        </>
      )}
    </div>
  );
}
