import { randomBytes, createHash } from "node:crypto";
import { managerFromRequest, type ManagerScope } from "@/lib/operator-session";
import { query, supabaseRest } from "@/lib/supabase-server";
export { query, supabaseRest };

export function error(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
export function manager(request: Request, scope?: ManagerScope) {
  const session = managerFromRequest(request);
  if (!session) return { error: error("Não autorizado.", 401) } as const;
  if (scope && session.scope !== scope)
    return {
      error: error("Você não tem acesso a esta operação.", 403),
    } as const;
  return { session } as const;
}
export function token() {
  return randomBytes(18).toString("base64url");
}
export function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
export const currentEvent = "dnj-2k26-curitiba";
export async function eventId() {
  const [event] = await supabaseRest<Array<{ id: string }>>(
    `events?${query({ select: "id", slug: `eq.${currentEvent}`, limit: 1 })}`,
  );
  return event?.id;
}
export function uiScope(scope: ManagerScope) {
  return scope === "space_timer"
    ? "space"
    : scope === "radicality"
      ? "actions"
      : "special_events";
}
export type ManagedRun = {
  id: string;
  status: "draft" | "active" | "paused" | "results" | "completed" | "cancelled";
  experience_id: string;
};
export async function ownActivityRun(managerId: string, runId: string) {
  const [run] = await supabaseRest<ManagedRun[]>(
    `activity_runs?${query({ select: "id,status,experience_id", id: `eq.${runId}`, started_by: `eq.${managerId}`, limit: 1 })}`,
  );
  return run ?? null;
}
export async function ownScheduleItem(userId: string, itemId: string) {
  const scopes = await supabaseRest<Array<{ space_id: string }>>(
    `manager_scopes?${query({ select: "space_id", user_id: `eq.${userId}`, scope: "eq.space_timer" })}`,
  );
  const ids = scopes.map((scope) => scope.space_id).filter(Boolean);
  if (!ids.length) return null;
  const [item] = await supabaseRest<
    Array<{ id: string; flex_minutes: number }>
  >(
    `experiences?${query({ select: "id,flex_minutes", id: `eq.${itemId}`, space_id: `in.(${ids.join(",")})`, kind: "eq.schedule", limit: 1 })}`,
  );
  return item ?? null;
}
