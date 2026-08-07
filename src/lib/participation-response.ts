import type { Participation } from "@/types/experience";

export type ParticipationRow = {
  id: string; checked_in_at: string; cooldown_ends_at: string; status: "active" | "completed" | "expired"; can_share_moment: boolean; check_in_points: number;
  events: { id: string; name: string } | null;
  experiences: { id: string; name: string; spaces: { id: string; name: string } | null } | null;
};

export function toParticipation(row: ParticipationRow, totalPoints?: number): Participation {
  return { id: row.id, event: row.events ?? { id: "", name: "DNJ 2K26" }, activity: row.experiences ?? { id: "", name: "Atividade DNJ" }, place: row.experiences?.spaces ?? { id: "", name: "Espaço DNJ" }, checkedInAt: row.checked_in_at, cooldownEndsAt: row.cooldown_ends_at, status: row.status, canShareMoment: row.can_share_moment, checkInPoints: row.check_in_points, newTotalPoints: totalPoints };
}

