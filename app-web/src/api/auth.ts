import { api, UnauthorizedError } from "./client.js";
import { queryClient } from "../query-client.js";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "dm";
  uiLocale: "en" | "fr" | null;
} | null;

export type BootstrapState = {
  adminExists: boolean;
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
  } finally {
    queryClient.setQueryData(["me"], null);
    await queryClient.invalidateQueries({ queryKey: ["me"] });
  }
}
