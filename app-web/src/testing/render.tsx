import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import "../i18n/index.js";

/**
 * Renders a page with the query client and initialized i18n. Router
 * hooks are mocked per test file (vi.mock "@tanstack/react-router").
 *
 * The provider travels through Testing Library's `wrapper` option: a
 * rerender keeps the same provider and the same client (replacing the
 * initial tree would remount the component and drop the client).
 *
 * Historical call sites pass a path as the second argument (never used
 * by the helper); it stays accepted-and-ignored.
 */
export function renderWithProviders(
  component: ReactElement,
  pathOrOptions?: string | { client?: QueryClient },
) {
  const opts = typeof pathOrOptions === "string" ? undefined : pathOrOptions;
  const client = opts?.client ?? new QueryClient();
  return render(component, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}
