import { useTranslation } from "react-i18next";
import { Field, inputClass } from "./form.js";
import type { useSlugAutoFill } from "../slug.js";

type SlugFields = ReturnType<typeof useSlugAutoFill>;

/** Title + slug pair driven by the create-form slug auto-fill hook. */
export function SlugTitleFields(props: { readonly fields: SlugFields }) {
  const { t } = useTranslation();
  return (
    <>
      <Field label={t("common.fields.title")}>
        <input
          name="title"
          required
          value={props.fields.title}
          onChange={(event) => props.fields.onTitleChange(event.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label={t("common.fields.slug")}>
        <input
          name="slug"
          required
          pattern="[a-z0-9-]+"
          value={props.fields.slug}
          onChange={(event) => props.fields.onSlugChange(event.target.value)}
          className={inputClass}
        />
      </Field>
    </>
  );
}
