import { apiRequest } from "@/lib/api/client";

export type MomentChallenge = {
  id: string;
  title: string;
  description: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  points: number;
};

type ApiChallenge = {
  id: string;
  name: string;
  description: string | null;
  startsAt: string | null;
  endsAt: string | null;
  momentPoints: number;
  allowsMoment: boolean;
  state?: string | null;
  status?: string | null;
};

export function isActiveMomentChallenge(item: ApiChallenge, now = Date.now()) {
  const state = (item.state ?? item.status ?? "").toLowerCase();
  const starts = item.startsAt ? new Date(item.startsAt).getTime() : Number.NEGATIVE_INFINITY;
  const ends = item.endsAt ? new Date(item.endsAt).getTime() : Number.POSITIVE_INFINITY;
  return item.allowsMoment && (state === "live" || state === "active") && starts <= now && ends > now;
}

export function normalizeMomentChallenge(item: ApiChallenge): MomentChallenge {
  return { id: item.id, title: item.name, description: item.description, startsAt: item.startsAt, endsAt: item.endsAt, points: item.momentPoints };
}

export function findActiveMomentChallenge(items: ApiChallenge[], now = Date.now()) {
  const item = items.find((candidate) => isActiveMomentChallenge(candidate, now));
  return item ? normalizeMomentChallenge(item) : null;
}

export const momentChallengesApi = {
  async active(now = Date.now()) {
    const response = await apiRequest<{ data: ApiChallenge[] }>("/activities?kind=challenge");
    return findActiveMomentChallenge(response.data, now);
  },
};
