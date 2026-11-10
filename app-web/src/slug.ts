import { useState } from "react";

/**
 * Deterministic slug from a title: Unicode diacritics folded to ASCII,
 * lowercased, non-alphanumeric runs collapsed to hyphens. Matches the
 * server-side slug rule `^[a-z0-9-]+$`.
 */
export function slugify(title: string): string {
  const collapsed = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
  const start = collapsed.startsWith("-") ? 1 : 0;
  const end = collapsed.endsWith("-") ? collapsed.length - 1 : collapsed.length;
  return start >= end ? "" : collapsed.slice(start, end);
}

/**
 * Create-form slug pairing: the slug pre-fills from the title as it is
 * typed; a manual slug edit pauses auto-fill, and editing the slug back to
 * the title-derived form (or a title change while unedited) resumes it.
 */
export function useSlugAutoFill() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return {
    title,
    slug,
    reset: () => {
      setTitle("");
      setSlug("");
      setSlugEdited(false);
    },
    onTitleChange: (value: string) => {
      setTitle(value);
      if (!slugEdited) setSlug(slugify(value));
    },
    onSlugChange: (value: string) => {
      setSlugEdited(value !== slugify(title));
      setSlug(value);
    },
  };
}
