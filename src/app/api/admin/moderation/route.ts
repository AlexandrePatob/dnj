import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { isModerationAction, type ModerationAction } from "@/lib/moments/moderation";
import { query, supabaseRest, supabaseStorage } from "@/lib/supabase-server";

type MomentModerationRow = {
  id: string;
  captured_at: string;
  points_awarded: number;
  moderation_status: "pending" | "approved" | "rejected";
  reward_status: "pending" | "awarded" | "denied";
  photo_status: "available" | "deleted";
  media_objects: { storage_key: string } | null;
  participations: { test_users: { display_name: string } | null; experiences: { name: string; kind: string } | null } | null;
};

type RpcDecision = { moment_id: string; storage_key: string; photo_deleted: boolean };

async function isAdmin() {
  return Boolean(verifyAdminCookie((await cookies()).get(adminCookie.name)?.value));
}

export async function GET(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const queue = new URL(request.url).searchParams.get("queue");
    const challenge = queue === "challenge";
    const moments = await supabaseRest<MomentModerationRow[]>(`moments?${query({
      select: "id,captured_at,points_awarded,moderation_status,reward_status,photo_status,media_objects(storage_key),participations!inner(test_users(display_name),experiences!inner(name,kind))",
      moderation_status: "eq.approved",
      reward_status: "eq.awarded",
      photo_status: "eq.available",
      "participations.experiences.kind": challenge ? "eq.moment_challenge" : "neq.moment_challenge",
      order: "captured_at.asc",
      limit: 50,
    })}`);
    return NextResponse.json({ moments: moments.map((moment) => ({ ...moment, imageUrl: moment.media_objects?.storage_key ? `/api/v1/media/${moment.media_objects.storage_key.split("/").map(encodeURIComponent).join("/")}` : undefined, participation: { participantName: moment.participations?.test_users?.display_name ?? "Participante", experienceName: moment.participations?.experiences?.name ?? "DNJ 2K26", isChallenge: moment.participations?.experiences?.kind === "moment_challenge" } })) });
  } catch {
    return NextResponse.json({ error: "Fila de Momentos indisponível." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  if (!await isAdmin()) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const data = await request.json().catch(() => ({})) as { id?: unknown; action?: unknown; reason?: unknown };
  const { id, action } = data;
  if (typeof id !== "string" || !isModerationAction(action) || "reason" in data) {
    return NextResponse.json({ error: "Decisão de moderação inválida." }, { status: 400 });
  }

  try {
    const current = await supabaseRest<Array<Pick<MomentModerationRow, "id" | "media_objects">>>(`moments?${query({ select: "id,media_objects(storage_key)", id: `eq.${id}`, limit: 1 })}`);
    if (!current[0]) return NextResponse.json({ error: "Momento não encontrado." }, { status: 404 });

    const storageKey = current[0].media_objects?.storage_key;
    if (action === "delete_photo" && storageKey) {
      await supabaseStorage(`object/dnj-moments/${encodeURIComponent(storageKey)}`, { method: "DELETE" });
    }

    const [decision] = await supabaseRest<RpcDecision[]>("rpc/moderate_moment", {
      method: "POST",
      body: JSON.stringify({ p_moment_id: id, p_decision: action satisfies ModerationAction, p_reason: null, p_moderator_user_id: null }),
    });
    return NextResponse.json({ ok: true, momentId: decision?.moment_id ?? id, action, photoDeleted: decision?.photo_deleted ?? action === "delete_photo" });
  } catch {
    return NextResponse.json({ error: "Não foi possível moderar o Momento." }, { status: 503 });
  }
}
