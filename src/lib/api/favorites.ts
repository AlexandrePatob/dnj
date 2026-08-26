import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";

export interface Favorite { id: string; name: string }
export interface FavoritePage { data: Favorite[]; pagination: { currentPage: number; hasNextPage: boolean; limit: number } }

export const favoritesApi = {
  list: (token?: string) => apiRequest<FavoritePage>("/users/me/favorites", { token }),
  add: (activityId: string, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<void>(`/users/me/favorites/${encodeURIComponent(activityId)}`, { method: "PUT", token, idempotencyKey }),
  remove: (activityId: string, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<void>(`/users/me/favorites/${encodeURIComponent(activityId)}`, { method: "DELETE", token, idempotencyKey }),
};
