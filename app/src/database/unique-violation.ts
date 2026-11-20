/**
 * Detects a PostgreSQL unique-constraint violation surfaced through
 * drizzle (the code sits on the error or its cause, depending on the
 * driver version; some paths only carry it in the message).
 */
export function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const { code } = error as { code?: string };
  const causeCode = (error as { cause?: { code?: string } }).cause?.code;
  // Only an explicit string message is matched: stringifying the object
  // itself would test the useless "[object Object]" default format.
  const message = (error as { message?: unknown }).message;
  return (
    code === "23505" ||
    causeCode === "23505" ||
    (typeof message === "string" &&
      /duplicate key|unique constraint/i.test(message))
  );
}
