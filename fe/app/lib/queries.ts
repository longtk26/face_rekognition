/**
 * Query option factories for TanStack Query.
 *
 * Each factory returns a `{ queryKey, queryFn }` object that can be used
 * identically in both:
 *   - A React Router **loader** (via `queryClient.prefetchQuery` /
 *     `queryClient.ensureQueryData`)
 *   - A React **component** (via `useQuery`)
 *
 * This guarantees the cache key is always consistent between server prefetch
 * and client read — preventing unnecessary duplicate fetches.
 *
 * ---------------------------------------------------------------------------
 * PATTERN
 * ---------------------------------------------------------------------------
 *
 * ```ts
 * export const <resource>Queries = {
 *   // Top-level key scopes all queries for this resource
 *   all: () => ({ queryKey: ['<resource>'] as const, queryFn: ... }),
 *   // Sub-queries narrow the key with additional segments
 *   list: (filters) => ({ queryKey: ['<resource>', 'list', filters] as const, queryFn: ... }),
 *   detail: (id) => ({ queryKey: ['<resource>', 'detail', id] as const, queryFn: ... }),
 * };
 * ```
 *
 * ---------------------------------------------------------------------------
 * USAGE — Loader (server-side prefetch)
 * ---------------------------------------------------------------------------
 *
 * ```ts
 * // app/routes/users/index.tsx
 * import { createQueryClient } from "~/lib/query-client";
 * import { dehydrate } from "@tanstack/react-query";
 * import { userQueries } from "~/lib/queries";
 *
 * export async function loader() {
 *   const queryClient = createQueryClient();
 *   await queryClient.prefetchQuery(userQueries.list());
 *   return { dehydratedState: dehydrate(queryClient) };
 * }
 * ```
 *
 * ---------------------------------------------------------------------------
 * USAGE — Component (client-side read from cache)
 * ---------------------------------------------------------------------------
 *
 * ```tsx
 * import { useQuery } from "@tanstack/react-query";
 * import { userQueries } from "~/lib/queries";
 *
 * export default function UsersPage() {
 *   // Cache hit on first render — data was prefetched in the loader.
 *   const { data: users, isPending } = useQuery(userQueries.list());
 *   if (isPending) return <Spinner />;
 *   return <UserList users={users} />;
 * }
 * ```
 *
 * ---------------------------------------------------------------------------
 * NOTE
 * ---------------------------------------------------------------------------
 * Replace `apiFetch` calls below with your actual API endpoints.
 * The examples use placeholder paths (`/users`, `/users/:id`) to demonstrate
 * the pattern — update them to match your backend.
 */

import { apiFetch } from "./api-fetch";

// ---------------------------------------------------------------------------
// Example: Users
// Duplicate this block for each resource in your application.
// ---------------------------------------------------------------------------

export interface UserListFilters {
  page?: number;
  limit?: number;
  search?: string;
}

export const userQueries = {
  /** Parent key — invalidate this to refetch all user queries at once. */
  all: () =>
    ({
      queryKey: ["users"] as const,
    }) as const,

  /** Paginated / filtered list of users. */
  list: (filters: UserListFilters = {}) =>
    ({
      queryKey: ["users", "list", filters] as const,
      queryFn: () =>
        apiFetch<unknown[]>("/users", {
          params: {
            page: filters.page,
            limit: filters.limit,
            search: filters.search,
          },
        }),
    }) as const,

  /** Single user by ID. */
  detail: (id: string) =>
    ({
      queryKey: ["users", "detail", id] as const,
      queryFn: () => apiFetch<unknown>(`/users/${id}`),
    }) as const,
};
