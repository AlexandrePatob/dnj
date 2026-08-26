import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";
import type { PageEnvelope } from "@/lib/api/contracts";

export interface V2Notification { id: string; title: string; message: string; read: boolean; createdAt: string }
export interface NotificationPreferences { email: boolean; push: boolean }

export const notificationsApi = {
  list: (cursor?: string, token?: string) => apiRequest<PageEnvelope<V2Notification>>(`/notifications${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { token }),
  markRead: (notificationId: string, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<V2Notification>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "PATCH", token, idempotencyKey }),
  updatePreferences: (preferences: NotificationPreferences, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<NotificationPreferences>("/notifications/preferences", { method: "PATCH", body: preferences, token, idempotencyKey }),
};
