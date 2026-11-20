import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import { RootLayout } from "./layout/RootLayout";
import { searchFlagTrue } from "./router/search-flag.js";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { LorePage } from "./pages/LorePage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignViewPage } from "./pages/CampaignViewPage";
import { CalendarPage } from "./pages/CalendarPage";
import { HomePage } from "./pages/HomePage";
import { AdminPage } from "./pages/AdminPage";
import { AccountPage } from "./pages/AccountPage";
import {
  ChapterRecordPage,
  LoreRecordPage,
  SceneRecordPage,
} from "./pages/RecordEditPage";
import { fetchBootstrapState, type BootstrapState } from "./api/auth.js";
import { queryClient } from "./query-client.js";
import "./i18n";
import "./styles.css";

const rootRoute = createRootRoute({
  component: RootLayout,
  // Fresh-instance guard: until the first account exists, every route
  // leads to /setup (the API is unreachable for anything else anyway).
  beforeLoad: async ({ location }) => {
    if (location.pathname === "/setup") return;
    // Fail open if the API is unreachable — nothing renders regardless.
    // Explicit cache read + fetch keeps us off the deprecated client
    // fetchQuery/ensureQueryData overloads (S1874).
    let state: BootstrapState | null =
      queryClient.getQueryData(["bootstrap"]) ?? null;
    if (!state) {
      state = await fetchBootstrapState().catch(() => null);
      if (state) queryClient.setQueryData(["bootstrap"], state);
    }
    if (state && !state.adminExists) {
      throw redirect({ to: "/setup" });
    }
  },
});
const loreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lore",
  component: LorePage,
  validateSearch: (search: Record<string, unknown>) => ({
    new: searchFlagTrue(search, "new"),
  }),
});
const campaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns",
  component: CampaignsPage,
});
const loreRecordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/lore/$id",
  component: LoreRecordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: searchFlagTrue(search, "edit"),
  }),
});
const campaignViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$id",
  component: CampaignViewPage,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: searchFlagTrue(search, "edit"),
  }),
});
const chapterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$id/$chapterId",
  component: ChapterRecordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: searchFlagTrue(search, "edit"),
  }),
});
const sceneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$id/$chapterId/$sceneId",
  component: SceneRecordPage,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: searchFlagTrue(search, "edit"),
  }),
});
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/calendar",
  component: CalendarPage,
});
const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});
const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminPage,
});
const accountRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/account",
  component: AccountPage,
});
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/setup",
  component: SetupPage,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    loreRoute,
    loreRecordRoute,
    campaignsRoute,
    campaignViewRoute,
    chapterRoute,
    sceneRoute,
    calendarRoute,
    homeRoute,
    adminRoute,
    accountRoute,
    loginRoute,
    setupRoute,
  ]),
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
