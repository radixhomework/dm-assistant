import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";

export type DistanceUnit = "m" | "ft";

/**
 * The world's distance unit (instance setting), used to label speeds and
 * senses in the stat blocks. Defaults to metres while unknown.
 */
export function useDistanceUnit(enabled = true): DistanceUnit {
  const query = useQuery({
    queryKey: ["display-settings"],
    queryFn: () => api<{ distanceUnit: DistanceUnit }>("/api/settings/display"),
    enabled,
  });
  if (query.isSuccess && (query.data?.distanceUnit === "ft")) return "ft";
  return "m";
}
