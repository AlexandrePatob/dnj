import { apiRequest } from "@/lib/api/client";

export type ScheduleItem = { id: string; title: string; description: string | null; startsAt: string; endsAt: string; sector: { id: string; name: string; slug: string } | null; state: "live" | "upcoming" | "scheduled" | "ended"; };
export type ScheduleResponse = { items: ScheduleItem[]; generatedAt: string };

export const scheduleApi = {
  list: (options: { view?: "home"; sector?: string } = {}) => {
    const params = new URLSearchParams();
    if (options.view) params.set("view", options.view);
    if (options.sector) params.set("sector", options.sector);
    return apiRequest<ScheduleResponse>(`/schedule${params.size ? `?${params}` : ""}`);
  },
};

