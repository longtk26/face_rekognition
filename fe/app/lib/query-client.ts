import { QueryClient } from "@tanstack/react-query";

/**
 * Create a new `QueryClient` with sensible defaults.
 *
 * **Important for SSR**: Call this function once per server request — never
 * share a singleton across requests. On the client, call it once at module
 * initialisation and hold the reference for the lifetime of the page.
 *
 * @example Server (loader)
 * ```ts
 * const queryClient = createQueryClient();
 * await queryClient.prefetchQuery(userQueries.all());
 * const dehydratedState = dehydrate(queryClient);
 * ```
 *
 * @example Client (provider)
 * ```ts
 * const [queryClient] = useState(createQueryClient);
 * ```
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * Data is considered fresh for 1 minute.
         * Prevents redundant refetches immediately after server-side prefetch.
         */
        staleTime: 60 * 1000,
        /**
         * Inactive query cache is kept for 5 minutes before garbage collection.
         */
        gcTime: 5 * 60 * 1000,
        /**
         * Retry once on failure (useful for transient network issues).
         */
        retry: 1,
        /**
         * Refetch when the window regains focus (React Query default).
         */
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
