/** Type-safe FormData extraction (Sonar S6551). */
export function formString(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}
