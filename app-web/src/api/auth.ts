import { api, UnauthorizedError } from "./client.js";
import { queryClient } from "../query-client.js";

export type CurrentUser = {
  id: string;
  username: string | null;
  email: string;
  displayName: string;
  role: "admin" | "dm";
  uiLocale: "en" | "fr" | null;
} | null;

export type BootstrapState = {
  adminExists: boolean;
  worldName: string | null;
};

export async function fetchMe(): Promise<CurrentUser> {
  try {
    return await api<CurrentUser>("/api/auth/me");
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

export function fetchBootstrapState(): Promise<BootstrapState> {
  return api<BootstrapState>("/api/bootstrap");
}

/**
 * The world name (white-label branding), read from the bootstrap cache —
 * the router guard guarantees it is loaded before any page renders.
 */
export function getWorldName(): string | null {
  return queryClient.getQueryData<BootstrapState>(["bootstrap"])?.worldName ?? null;
}

export type ProfileInput = {
  email?: string;
  displayName?: string;
  uiLocale?: "en" | "fr";
};

export function updateProfile(input: ProfileInput): Promise<CurrentUser> {
  return api<CurrentUser>("/api/auth/me", { method: "PATCH", body: input });
}

export async function changeMyPassword(
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await api<void>("/api/auth/me/password", {
    method: "POST",
    body: { currentPassword, newPassword },
  });
}

export function adminDeleteUser(userId: string): Promise<void> {
  return api<void>(`/api/admin/users/${userId}`, { method: "DELETE" });
}

export function adminResetPassword(
  userId: string,
  newPassword: string,
): Promise<unknown> {
  return api(`/api/admin/users/${userId}/password`, {
    method: "POST",
    body: { newPassword },
  });
}

/** Logs out and clears the cached auth state in one step. */
export async function logout(): Promise<void> {
  try {
    await api<void>("/api/auth/logout", { method: "POST" });
  } catch {
    // The session may already be gone (expired, network down); the local
    // auth state is cleared regardless so the UI still leaves the page.
  } finally {
    queryClient.setQueryData(["me"], null);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }
}
