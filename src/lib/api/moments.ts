import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";
import type { PageEnvelope } from "@/lib/api/contracts";
import type { Moment } from "@/types/experience";
export type MomentScope = "feed" | "mine" | "group";
export const momentsApi = {
  list: (scope: MomentScope, cursor?: string) => apiRequest<PageEnvelope<Moment>>(`/moments?scope=${scope}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`),
  like: (momentId: string, idempotencyKey = newIdempotencyKey()) => apiMutation<{ momentId: string; liked: boolean; likesCount: number }>(`/moments/${encodeURIComponent(momentId)}/like`, { method: "POST", idempotencyKey }),
};
