/**
 * Mutation option factories for TanStack Query.
 *
 * Each factory returns a `{ mutationFn, onSuccess?, onError? }` object
 * consumed by `useMutation`. Centralising mutations here:
 *   - Keeps `mutationFn` implementations out of component files.
 *   - Provides a single place to attach shared side-effects (e.g. toast
 *     notifications, query invalidation).
 *   - Makes it easy to reuse the same mutation from different components.
 *
 * ---------------------------------------------------------------------------
 * PATTERN
 * ---------------------------------------------------------------------------
 *
 * ```ts
 * export const <resource>Mutations = {
 *   create: () => ({
 *     mutationFn: (dto: CreateDto) => apiFetch('/resource', { method: 'POST', body: dto }),
 *   }),
 *   update: () => ({
 *     mutationFn: ({ id, ...dto }: UpdateDto) =>
 *       apiFetch(`/resource/${id}`, { method: 'PATCH', body: dto }),
 *   }),
 *   remove: () => ({
 *     mutationFn: (id: string) => apiFetch(`/resource/${id}`, { method: 'DELETE' }),
 *   }),
 * };
 * ```
 *
 * ---------------------------------------------------------------------------
 * USAGE — Component
 * ---------------------------------------------------------------------------
 *
 * ```tsx
 * import { useMutation, useQueryClient } from "@tanstack/react-query";
 * import { userMutations } from "~/lib/mutations";
 * import { userQueries } from "~/lib/queries";
 *
 * export function CreateUserForm() {
 *   const queryClient = useQueryClient();
 *
 *   const { mutate, isPending } = useMutation({
 *     ...userMutations.create(),
 *     onSuccess: () => {
 *       // Invalidate the users list so it refetches with the new entry
 *       queryClient.invalidateQueries({ queryKey: userQueries.all().queryKey });
 *     },
 *   });
 *
 *   return (
 *     <form onSubmit={(e) => {
 *       e.preventDefault();
 *       mutate({ name: "Alice" });
 *     }}>
 *       <button type="submit" disabled={isPending}>Create</button>
 *     </form>
 *   );
 * }
 * ```
 *
 * ---------------------------------------------------------------------------
 * NOTE
 * ---------------------------------------------------------------------------
 * Replace `apiFetch` paths below with your actual API endpoints.
 * Type the DTOs in a co-located `types.ts` file (e.g. `app/routes/users/types.ts`).
 */

import { apiFetch } from "./api-fetch";

// ---------------------------------------------------------------------------
// Example: Users
// ---------------------------------------------------------------------------

export interface CreateUserDto {
  name: string;
  email: string;
}

export interface UpdateUserDto {
  id: string;
  name?: string;
  email?: string;
}

export const userMutations = {
  /** Create a new user. */
  create: () => ({
    mutationFn: (dto: CreateUserDto) =>
      apiFetch<unknown, CreateUserDto>("/users", {
        method: "POST",
        body: dto,
      }),
  }),

  /** Partially update an existing user by ID. */
  update: () => ({
    mutationFn: ({ id, ...dto }: UpdateUserDto) =>
      apiFetch<unknown, Omit<UpdateUserDto, "id">>(`/users/${id}`, {
        method: "PATCH",
        body: dto,
      }),
  }),

  /** Delete a user by ID. */
  remove: () => ({
    mutationFn: (id: string) =>
      apiFetch<void>(`/users/${id}`, {
        method: "DELETE",
      }),
  }),
};
