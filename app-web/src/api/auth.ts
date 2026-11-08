import { api, UnauthorizedError } from "./client.js";

export type CurrentUser = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "dm";
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
