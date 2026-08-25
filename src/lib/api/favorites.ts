import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";

export interface Favorite { activityId: string; favorited: boolean }

export const favoritesApi = {
  list: (token?: string) => apiRequest<Favorite[]>("/favorites", { token }),
  add: (activityId: string, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<Favorite>(`/activities/${encodeURIComponent(activityId)}/favorite`, { method: "PUT", token, idempotencyKey }),
  remove: (activityId: string, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<Favorite>(`/activities/${encodeURIComponent(activityId)}/favorite`, { method: "DELETE", token, idempotencyKey }),
};
