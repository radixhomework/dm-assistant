import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { RootLayout } from "./layout/RootLayout";
import { SetupPage } from "./pages/SetupPage";
import { LoginPage } from "./pages/LoginPage";
import { LorePage } from "./pages/LorePage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { CampaignViewPage } from "./pages/CampaignViewPage";
import { AdminPage } from "./pages/AdminPage";
import { RecordEditPage } from "./pages/RecordEditPage";
import "./i18n";
import "./styles.css";

const rootRoute = createRootRoute({ component: RootLayout });
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
    loginRoute,
    setupRoute,
  ]),
});

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
