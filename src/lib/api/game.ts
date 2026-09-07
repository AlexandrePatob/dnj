import { apiMutation, apiRequest, newIdempotencyKey } from "@/lib/api/client";
import type { V2GameOverview, V2Participation } from "@/lib/api/contracts";
export type GameRun = { id: string; status: string; gameName?: string; [key: string]: unknown };
export type QrActivityKind = "schedule" | "checkpoint" | "challenge" | "competitive" | "live";
export type ValidateQrResponse = { participation: V2Participation; activityKind: QrActivityKind; action?: "joined" | "scored"; pointsAwarded?: number };
export const gameApi = {
  overview: () => apiRequest<V2GameOverview>("/game/overview"),
  currentRun: async (runId?: string) => { try { return (await apiRequest<{ run: GameRun }>(`/activity-runs/current${runId ? `?runId=${encodeURIComponent(runId)}` : ""}`)).run; } catch (e) { if ((e as { status?: number }).status === 204) return null; throw e; } },
  currentParticipation: async () => { try { return (await apiRequest<{ participation: V2Participation }>("/participations/current")).participation; } catch (e) { if ((e as { status?: number }).status === 204) return null; throw e; } },
  validateQr: (qrToken: string, idempotencyKey = newIdempotencyKey()) => apiMutation<ValidateQrResponse>("/qr/validate", { method: "POST", body: { qrToken }, idempotencyKey }),
};
