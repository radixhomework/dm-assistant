import type { ReactNode } from "react";

/** Shared input styling — keep form controls visually consistent. */
export const inputClass = "rounded-md border border-border bg-background px-3 py-2";

/** Label + control pairing used by every form in the application. */
export function Field(props: {
  readonly label: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {props.label}
      {props.children}
    </label>
  );
}
