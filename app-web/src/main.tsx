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
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { LorePage } from "./pages/LorePage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignViewPage } from "./pages/CampaignViewPage";
import { AdminPage } from "./pages/AdminPage";
import { AccountPage } from "./pages/AccountPage";
import { RecordEditPage } from "./pages/RecordEditPage";
import { fetchBootstrapState } from "./api/auth.js";
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
    const state = await queryClient
      .ensureQueryData({
        queryKey: ["bootstrap"],
        queryFn: fetchBootstrapState,
        staleTime: 30_000,
      })
      .catch(() => null);
    if (state && !state.adminExists) {
      throw redirect({ to: "/setup" });
    }
  },
});
const loreRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: LorePage,
});
const campaignsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns",
  component: CampaignsPage,
});
const recordEditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/records/$slug",
  component: RecordEditPage,
});
const campaignViewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/campaigns/$slug",
  component: CampaignViewPage,
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
    recordEditRoute,
    campaignsRoute,
    campaignViewRoute,
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
