import { QueryClient } from "@tanstack/react-query";

/**
 * Shared react-query client: auth transitions (login, logout, profile
 * updates) invalidate the ["me"] cache here, so every consumer sees the
 * same auth state.
 */
export const queryClient = new QueryClient();
