import { useState } from "react";

/**
 * Deterministic slug from a title: Unicode diacritics folded to ASCII,
 * lowercased, non-alphanumeric runs collapsed to hyphens. Matches the
 * server-side slug rule `^[a-z0-9-]+$`.
 */
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
