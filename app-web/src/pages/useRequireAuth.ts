import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchMe, type CurrentUser } from "../api/auth.js";

/** Guards a protected page: redirects to /login when unauthenticated. */
export function useRequireAuth(): {
  user: CurrentUser | null;
  ready: boolean;
} {
  const me = useQuery({ queryKey: ["me"], queryFn: fetchMe, retry: false });
  const navigate = useNavigate();

  useEffect(() => {
    if (!me.isPending && me.data === null) {
      void navigate({ to: "/login" });
    }
  }, [me.isPending, me.data, navigate]);

  return {
    user: me.data ?? null,
    ready: !me.isPending && me.data !== null,
  };
}
