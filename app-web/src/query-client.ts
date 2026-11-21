import { QueryClient } from "@tanstack/react-query";

/**
 * Shared react-query client: auth transitions (login, logout, profile
 * updates) invalidate the ["me"] cache here, so every consumer sees the
 * same auth state.
 *
 * refetchOnWindowFocus is disabled: focus changes happen constantly while
 * editing a record (toolbar clicks, popup interactions) and a refetch
 * would reset in-progress form state mid-edit. Staleness is handled by
 * explicit invalidations at each mutation site instead.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});
