export class UnauthorizedError extends Error {
  constructor() {
    super("unauthenticated");
  }
}

/**
 * An API error carrying the backend's stable error code (PRE-SPEC §1):
 * the backend never returns formatted human messages — callers translate
 * `errors.<code>` through the i18n catalogs, falling back to the message.
 */
export class ApiError extends Error {
  readonly code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.code = code;
  }
}

/** Fetch wrapper: JSON in/out, credentials included, typed errors. */
export async function api<T>(
  path: string,
  options?: Omit<RequestInit, "body"> & { body?: unknown },
): Promise<T> {
  const { body, ...rest } = options ?? {};
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    ...rest,
    body: body === undefined ? undefined : (JSON.stringify(body) as RequestInit["body"]),
  });
  if (res.status === 401) throw new UnauthorizedError();
  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as
      | { message?: string; code?: string }
      | null;
    const message = payload?.message ?? res.statusText;
    if (payload?.code) {
      throw new ApiError(message, payload.code);
    }
    throw new Error(message);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // Void endpoints answer with an empty body (204 or empty 200): no JSON.
    return undefined as T;
  }
}
