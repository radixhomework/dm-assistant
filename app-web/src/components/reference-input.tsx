import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client.js";

/**
 * Typeahead picking a record of one target template (records-editor
 * 4.3): autocompletion on title/slug through the trigram endpoint.
 * Picking calls onPick and clears the input.
 */
export function ReferenceInput(props: {
  readonly targetType: string;
  readonly placeholder: string;
  readonly onPick: (slug: string, title: string) => void;
}) {
  const [query, setQuery] = useState("");
  const suggestions = useQuery({
    queryKey: ["reference-search", props.targetType, query],
    queryFn: () =>
      api<Array<{ slug: string; title: string }>>(
        `/api/records?q=${encodeURIComponent(query)}&type=${props.targetType}`,
      ),
    enabled: query.trim().length > 0,
  });
  const matches = (suggestions.data ?? []).slice(0, 8);
  return (
    <div className="relative">
      <input
        value={query}
        placeholder={props.placeholder}
        onChange={(event) => setQuery(event.target.value)}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
      />
      {query.trim() !== "" && matches.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface shadow-lg">
          {matches.map((match) => (
            <li key={match.slug}>
              <button
                type="button"
                onClick={() => {
                  props.onPick(match.slug, match.title);
                  setQuery("");
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-ink transition-colors duration-200 hover:bg-surface"
              >
                <span className="font-medium">{match.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
