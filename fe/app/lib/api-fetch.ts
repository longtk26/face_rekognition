/**
 * Typed API error thrown when the server returns a non-2xx response.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly data: unknown,
  ) {
    super(`API Error ${status}: ${statusText}`);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface ApiFetchOptions<TBody = unknown> {
  method?: HttpMethod;
  /** Request body — will be JSON-serialized automatically. */
  body?: TBody;
  /** Extra headers merged on top of Content-Type / Accept. */
  headers?: Record<string, string>;
  /** Query-string parameters appended to the URL. */
  params?: Record<string, string | number | boolean | undefined | null>;
  /** Pass the incoming `Request` to forward cookies/auth headers server-side. */
  request?: Request;
}

// ---------------------------------------------------------------------------
// Base URL resolution
// ---------------------------------------------------------------------------

/**
 * Resolve the absolute base URL for API requests.
 *
 * - On the **server**, we need an absolute URL. Set the `API_BASE_URL`
 *   environment variable (e.g. `http://localhost:4000`).
 * - On the **client**, relative paths are used so the request goes through
 *   the same origin (or your reverse proxy).
 */
function getBaseUrl(): string {
  if (typeof window === "undefined") {
    // Server-side: must be absolute
    return process.env.API_BASE_URL ?? "";
  }
  // Client-side: relative is fine
  return "";
}

// ---------------------------------------------------------------------------
// Core helper
// ---------------------------------------------------------------------------

/**
 * Reusable fetch wrapper with automatic JSON serialization / deserialization.
 *
 * Works both **server-side** (inside React Router `loader` / `action`) and
 * **client-side** (inside TanStack Query `queryFn` / `mutationFn`).
 *
 * @example Server-side (loader)
 * ```ts
 * export async function loader({ request }: Route.LoaderArgs) {
 *   const users = await apiFetch<User[]>("/users", { request });
 *   return { users };
 * }
 * ```
 *
 * @example Client-side (mutation)
 * ```ts
 * const mutation = useMutation(userMutations.create());
 * mutation.mutate({ name: "Alice" });
 * ```
 */
export async function apiFetch<TResponse = unknown, TBody = unknown>(
  path: string,
  options: ApiFetchOptions<TBody> = {},
): Promise<TResponse> {
  const { method = "GET", body, headers = {}, params, request } = options;

  // Build URL
  const url = new URL(`${getBaseUrl()}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  // Forward auth / cookie headers from an incoming server request
  const forwardedHeaders: Record<string, string> = {};
  if (request) {
    const cookie = request.headers.get("cookie");
    if (cookie) forwardedHeaders["cookie"] = cookie;

    const authorization = request.headers.get("authorization");
    if (authorization) forwardedHeaders["authorization"] = authorization;
  }

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...forwardedHeaders,
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse response body (JSON when possible, raw text otherwise)
  let data: unknown;
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, data);
  }

  return data as TResponse;
}
