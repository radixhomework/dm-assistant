export class UnauthorizedError extends Error {
  constructor() {
    super("unauthenticated");
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
      | { message?: string }
      | null;
    throw new Error(payload?.message ?? res.statusText);
  }
  try {
    return (await res.json()) as T;
  } catch {
    // Void endpoints answer with an empty body (204 or empty 200): no JSON.
    return undefined as T;
  }
}
