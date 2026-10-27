import "server-only";
import { apiUrl } from "./env";
import { adminBearer } from "./admin";

// Server-side calls from the website to the Express API (server/). Admin calls carry the
// logged-in team member's token; the API checks it and their role on every request.

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type Options = {
  method?: string;
  body?: unknown;
  /** Defaults to the logged-in team member's token; null sends none (public endpoints). */
  token?: string | null;
  /** Next.js cache options; without them the call is never cached. */
  next?: NextFetchRequestConfig;
};

export async function api<T = void>(path: string, { method = "GET", body, token, next }: Options = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers["content-type"] = "application/json";
  const bearer = token === undefined ? await adminBearer() : token;
  if (bearer) headers.authorization = "Bearer " + bearer;

  const res = await fetch(apiUrl() + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...(next ? { next } : { cache: "no-store" }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(res.status, err?.error || res.statusText);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}
