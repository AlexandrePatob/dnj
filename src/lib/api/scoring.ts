import { apiMutation, apiRequest } from "./client";

export type ScoringStatus = {
  scoringClosed: boolean;
  closedAt?: string;
  auditNote?: string;
};

export async function getScoringStatus(): Promise<ScoringStatus> {
  return apiRequest<ScoringStatus>("/event-settings/scoring");
}

export async function closeScoring(auditNote?: string): Promise<ScoringStatus> {
  return apiMutation<ScoringStatus>("/admin/event-settings/scoring/close", {
    method: "POST",
    body: { auditNote: auditNote ?? "" },
  });
}

export async function openScoring(auditNote?: string): Promise<ScoringStatus> {
  return apiMutation<ScoringStatus>("/admin/event-settings/scoring/open", {
    method: "POST",
    body: { auditNote: auditNote ?? "" },
  });
}
