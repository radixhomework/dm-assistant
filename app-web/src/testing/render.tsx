import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import "../i18n/index.js";

/** Renders a page with the query client and initialized i18n.
 *  Router hooks are mocked per test file (vi.mock "@tanstack/react-router"). */
export function renderWithProviders(component: ReactElement, _path?: string): void {
  render(
    <QueryClientProvider client={new QueryClient()}>
      {component}
    </QueryClientProvider>,
  );
}
