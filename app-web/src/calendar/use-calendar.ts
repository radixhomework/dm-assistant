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
    // react-query v5 treats an undefined queryFn result as an error; the
    // api client answers undefined on the empty 200 body (no definition
    // yet) — normalize it to null.
    queryFn: async () => {
      const value = await api<CalendarSettings | null>("/api/settings/calendar");
      return value ?? null;
    },
    enabled,
  });
  // The api client answers undefined on an empty 200 body (no definition
  // yet): normalize it to null so consumers see one "absent" shape.
  const data =
    calendar.isSuccess && calendar.data === undefined ? null : calendar.data;
  return { calendar, definition: isCalendarDefinition(data) ? data : null };
}
