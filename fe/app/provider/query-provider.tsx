"use client";

import { useState } from "react";
import {
  QueryClientProvider,
  HydrationBoundary,
  type DehydratedState,
} from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createQueryClient } from "../lib/query-client";

interface QueryProviderProps {
  children: React.ReactNode;
  /**
   * Dehydrated state from the server — pass the value returned by
   * `dehydrate(queryClient)` in the root loader.
   *
   * This populates the client-side cache on first render so components
   * that use `useQuery` with the same keys never flash a loading state.
   */
  dehydratedState?: DehydratedState;
}

/**
 * Application-level TanStack Query provider.
 *
 * Place this as a wrapper inside `root.tsx`'s `Layout` component and pass
 * `dehydratedState` from the root loader for SSR cache hydration.
 *
 * @example
 * ```tsx
 * // app/root.tsx
 * export function Layout({ children }: { children: React.ReactNode }) {
 *   const { dehydratedState } = useLoaderData<typeof loader>();
 *   return (
 *     <html>
 *       <body>
 *         <QueryProvider dehydratedState={dehydratedState}>
 *           {children}
 *         </QueryProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function QueryProvider({
  children,
  dehydratedState,
}: QueryProviderProps) {
  /**
   * `useState` with an initializer ensures the QueryClient is created once
   * per client-side page load and is not re-created on re-renders.
   */
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
