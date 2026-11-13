import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BookOpen, Menu, Shield, Swords, X } from "lucide-react";
import { AppSidebar } from "../components/app-sidebar.js";
import { CampaignSidebar } from "../components/campaign-sidebar.js";
import { fetchMe, getWorldName, logout } from "../api/auth.js";
import { queryClient } from "../query-client.js";
import type { Entity } from "../types.js";

const navItemClass = (active: boolean) =>
  `flex items-center gap-1.5 font-display text-xl px-3 py-1 rounded-md transition-colors duration-200 ${
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

  // Contextual sidebar, resolved from the route and the cached record
  // metadata (perimeter + owning campaign). Unknown during load → the
  // record page renders without a sidebar until the cache fills.
  const recordMatch = /^\/records\/([^/]+)$/.exec(pathname);
  const campaignViewMatch = /^\/campaigns\/([^/]+)$/.exec(pathname);
  const decodedSlug = recordMatch ? decodeURIComponent(recordMatch[1]) : null;
  const cached = recordMatch
    ? queryClient.getQueryData<Entity>(["record", decodedSlug])
    : undefined;
  type SidebarMode =
    | { kind: "lore" }
    | { kind: "campaign"; slug: string }
    | { kind: "none" };
  let mode: SidebarMode = { kind: "lore" };
  if (pathname === "/admin" || pathname === "/account" || pathname === "/campaigns") {
    mode = { kind: "none" };
  } else if (campaignViewMatch) {
    mode = { kind: "campaign", slug: decodeURIComponent(campaignViewMatch[1]) };
  } else if (recordMatch && cached?.perimeter === "campaign") {
    const campaignSlug =
      cached.type === "campaign" ? cached.slug : cached.campaign?.slug ?? null;
    mode = campaignSlug ? { kind: "campaign", slug: campaignSlug } : { kind: "none" };
  }

  const loreActive = mode.kind === "lore";
  const campaignsActive = mode.kind === "campaign" || pathname === "/campaigns";

  return (
    <div className="flex min-h-screen flex-col">
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
                  <BookOpen className="size-4" aria-hidden />
                  {t("nav.lore")}
                </Link>
                <Link to="/campaigns" className={navItemClass(campaignsActive)}>
                  <Swords className="size-4" aria-hidden />
                  {t("nav.campaigns")}
                </Link>
                {user?.role === "admin" && (
                  <Link to="/admin" className={navItemClass(pathname === "/admin")}>
                    <Shield className="size-4" aria-hidden />
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-1 items-stretch">
            {mode.kind !== "none" && (
              <aside
                className={`${
                  sidebarOpen
                    ? "fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto bg-surface shadow-xl"
                    : "hidden"
                } md:static md:z-auto md:flex md:w-[260px] md:shrink-0 md:border-r md:border-border`}
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
                  {mode.kind === "lore" ? (
                    <AppSidebar />
                  ) : (
                    <CampaignSidebar
                      campaignSlug={mode.slug}
                      // The campaign view highlights the campaign header;
                      // record pages highlight their own entry.
                      activeSlug={decodedSlug ?? mode.slug}
                    />
                  )}
                </div>
              </aside>
            )}
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
