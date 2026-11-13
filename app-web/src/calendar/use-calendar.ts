import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";
import type { CalendarSettings } from "@dm/schemas";

/** Structural guard: only a real definition counts (stubs and legacy
 * values answer non-objects). */
export function isCalendarDefinition(
  value: CalendarSettings | null | undefined,
): value is CalendarSettings {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as CalendarSettings).months)
  );
}

/**
 * Shared read of the world calendar definition: one query cache entry
 * ("calendar-settings") consumed by the year overview, the admin editor,
 * the date picker and the date node. A stored-but-invalid definition
 * reads as null.
 */
export function useCalendarDefinition(enabled = true) {
  const calendar = useQuery({
    queryKey: ["calendar-settings"],
    queryFn: () => api<CalendarSettings | null>("/api/settings/calendar"),
    enabled,
  });
  return { calendar, definition: isCalendarDefinition(calendar.data) ? calendar.data : null };
}
