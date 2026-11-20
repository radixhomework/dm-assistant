/**
 * `?key=1` parses as the number 1 (TanStack Router JSON-parses search
 * values): a boolean route flag accepts the numeric, string and boolean
 * forms. Returns true when the flag is set, undefined otherwise.
 */
export function searchFlagTrue(
  search: Record<string, unknown>,
  key: string,
): true | undefined {
  return search[key] === 1 || search[key] === "1" || search[key] === true
    ? true
    : undefined;
}
