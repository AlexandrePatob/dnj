import { apiRequest } from "@/lib/api/client";
export type Activity = { id: string; name: string; description?: string | null; startsAt?: string; endsAt?: string; [key: string]: unknown };
export type Space = { id: string; name: string; [key: string]: unknown };
const query = (values: Record<string, string | undefined>) => { const p = new URLSearchParams(); Object.entries(values).forEach(([k,v]) => v && p.set(k,v)); return p.size ? `?${p}` : ""; };
export const activitiesApi = {
  schedule: (options: { view?: string; sector?: string } = {}) => apiRequest<unknown>(`/schedule${query(options)}`),
  activity: (id: string) => apiRequest<Activity>(`/activities/${encodeURIComponent(id)}`),
  list: (options: { cursor?: string; placeId?: string } = {}) => apiRequest<Activity[]>(`/activities${query(options)}`),
  spaces: () => apiRequest<Space[]>("/spaces"),
};
