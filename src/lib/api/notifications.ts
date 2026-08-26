import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";

export interface V2Notification { id: string; title: string; body: string; state: string; createdAt: string }
export interface NotificationPreferences { announcementEnabled: boolean; pointsEnabled: boolean; momentModerationEnabled?: boolean; updatedAt?: string }

export const notificationsApi = {
  list: (page?: number, token?: string) => apiRequest<{ data: V2Notification[]; pagination: { currentPage: number; hasNextPage: boolean; limit: number }; unreadCount: number }>(`/notifications${page ? `?page=${page}` : ""}`, { token }),
  markRead: (notificationId: string, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<V2Notification>(`/notifications/${encodeURIComponent(notificationId)}/read`, { method: "POST", token, idempotencyKey }),
  updatePreferences: (preferences: NotificationPreferences, token?: string, idempotencyKey = newIdempotencyKey()) =>
    apiMutation<NotificationPreferences>("/notifications/preferences", { method: "PUT", body: preferences, token, idempotencyKey }),
};
