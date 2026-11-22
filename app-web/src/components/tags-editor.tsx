import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { fetchTags } from "../api/search.js";

/**
 * Normalizes locally the way the server does (trim, lowercase, internal
 * whitespace collapsed) so the chips match what will be stored.
 */
function normalizeLocal(tag: string): string {
  return tag.trim().replaceAll(/\s+/g, " ").toLowerCase();
}

/**
 * The tags system section of the record edit form (record-tags
 * capability): chip-per-tag with removal, an adding input fed by the
 * instance's tag inventory as completion suggestions, Enter/comma to
 * add and Backspace on the empty input to remove the last chip. Tags
 * are instance-level metadata — this section is NOT a template field.
 */
export function TagsEditor(props: {
  readonly tags: readonly string[];
  readonly onChange: (tags: string[]) => void;
  readonly disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const inventory = useQuery({
    queryKey: ["tags"],
    queryFn: fetchTags,
    staleTime: Infinity,
  });

  function addTag(raw: string) {
    const value = normalizeLocal(raw);
    if (value.length === 0 || props.tags.includes(value)) {
      return;
    }
    props.onChange([...props.tags, value]);
  }

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    // An IME composition confirms its candidate with Enter (and fires
    // keydown events during composition): ignore those — the draft is
    // not final text yet (CodeRabbit round-2 review).
    if (event.nativeEvent.isComposing) {
      return;
    }
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      addTag(draft);
      setDraft("");
    } else if (event.key === "Backspace" && draft.length === 0 && props.tags.length > 0) {
      props.onChange(props.tags.slice(0, -1));
    }
  }

  // Defensive: an empty-object payload (a stub, an empty 204-style
  // response body) must not crash the editor.
  const suggestions = Array.isArray(inventory.data)
    ? inventory.data.map((entry) => entry.tag)
    : [];

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label className="text-muted" htmlFor="record-tags">
        {t("record.tags")}
      </label>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1.5">
        {props.tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-sm border border-border bg-surface px-1.5 py-0.5 text-xs text-ink"
          >
            {tag}
            <button
              type="button"
              disabled={props.disabled}
              onClick={() => props.onChange(props.tags.filter((value) => value !== tag))}
              aria-label={t("record.removeTag", { tag })}
              className="text-muted transition-colors duration-200 hover:text-radish disabled:opacity-50"
            >
              ×
            </button>
          </span>
        ))}
        <input
          id="record-tags"
          list="tag-inventory"
          value={draft}
          disabled={props.disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onInputKeyDown}
          onBlur={() => {
            addTag(draft);
            setDraft("");
          }}
          aria-label={t("record.tagsAdd")}
          className="min-w-[10ch] flex-1 bg-transparent py-0.5 text-ink placeholder:text-muted focus:outline-none"
        />
        <datalist id="tag-inventory">
          {suggestions.map((tag) => (
            <option key={tag} value={tag} />
          ))}
        </datalist>
      </div>
      <p className="text-xs text-muted">{t("record.tagsHelp")}</p>
    </div>
  );
}
