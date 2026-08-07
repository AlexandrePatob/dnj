import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { query, supabaseRest, supabaseStorage } from "@/lib/supabase-server";

type Scope = "feed" | "mine" | "group";
type MomentRow = { id: string; participation_id: string; publication_status: "private" | "public"; moderation_status: "pending" | "approved" | "rejected"; points_awarded: number; captured_at: string; removal_reason: string | null; photo_status: "available" | "deleted"; media_objects: { storage_key: string } | null; participations: { user_id: string; test_users: { group_id: string | null; display_name: string } | null; experiences: { spaces: { name: string } | null } | null } | null };
type LikeRow = { moment_id: string; user_id: string };
type ParticipationForMoment = {
  id: string;
  can_share_moment: boolean;
  experiences: {
    kind: string;
    status: string;
    ends_at: string | null;
    moment_points: number;
  } | null;
};

function unauthorized() { return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 }); }
function responseMoment(row: MomentRow, likes: LikeRow[], currentUserId: string | null) {
  const relatedLikes = likes.filter((like) => like.moment_id === row.id);
  const imageUrl = row.media_objects?.storage_key ? `/api/v1/media/${row.media_objects.storage_key.split("/").map(encodeURIComponent).join("/")}` : "";
  const moderationMessage = row.moderation_status !== "rejected" ? undefined : row.photo_status === "deleted" ? "Sua foto não está apropriada para este momento; ela foi separada. Tome cuidado." : "Sua foto não atendeu o desafio.";
  return { id: row.id, participationId: row.participation_id, imageUrl, thumbnailUrl: imageUrl, shareImageUrl: imageUrl, placeName: row.participations?.experiences?.spaces?.name ?? "DNJ 2K26", authorName: row.participations?.test_users?.display_name ?? "Participante DNJ", capturedAt: row.captured_at, moderationStatus: row.moderation_status, publicationStatus: row.publication_status, pointsAwarded: row.points_awarded, moderationMessage, likesCount: relatedLikes.length, likedByCurrentUser: Boolean(currentUserId && relatedLikes.some((like) => like.user_id === currentUserId)), comments: [], groupId: row.participations?.test_users?.group_id ?? undefined };
}

async function readRows(scope: Scope, userId: string | null) {
  const filters: Record<string, string | number> = { select: "id,participation_id,publication_status,moderation_status,points_awarded,captured_at,removal_reason,photo_status,media_objects(storage_key),participations!inner(user_id,test_users(group_id,display_name),experiences(spaces(name)))", order: "captured_at.desc", limit: 30 };
  if (scope === "feed") { filters.publication_status = "eq.public"; filters.moderation_status = "in.(pending,approved)"; }
  if (scope === "mine" && userId) filters["participations.user_id"] = `eq.${userId}`;
  if (scope === "group" && userId) {
    const [user] = await supabaseRest<Array<{ group_id: string | null }>>(`test_users?${query({ select: "group_id", id: `eq.${userId}`, limit: 1 })}`);
    if (!user?.group_id) return [] as MomentRow[];
    filters["participations.test_users.group_id"] = `eq.${user.group_id}`;
  }
  return supabaseRest<MomentRow[]>(`moments?${query(filters)}`);
}

export async function GET(request: Request) {
  const scope = new URL(request.url).searchParams.get("scope") as Scope | null;
  if (!scope || !["feed", "mine", "group"].includes(scope)) return NextResponse.json({ code: "IMAGE_INVALID", message: "scope deve ser feed, mine ou group." }, { status: 400 });
  const userId = participantIdFrom(request);
  if (scope !== "feed" && !userId) return unauthorized();
  const rows = await readRows(scope, userId);
  const ids = rows.map((row) => row.id);
  const likes = ids.length ? await supabaseRest<LikeRow[]>(`moment_likes?${query({ select: "moment_id,user_id", moment_id: `in.(${ids.join(",")})` })}`) : [];
  return NextResponse.json({ scope, items: rows.map((row) => responseMoment(row, likes, userId)), nextCursor: null });
}

export async function POST(request: Request) {
  const userId = participantIdFrom(request);
  if (!userId) return unauthorized();
  const data = await request.formData();
  const participationId = data.get("participationId");
  const image = data.get("image");
  const publishConsent = data.get("publishConsent") === "true";
  const idempotencyKey = data.get("idempotencyKey");
  if (typeof participationId !== "string" || typeof idempotencyKey !== "string" || !(image instanceof Blob) || !/^[0-9a-f-]{36}$/i.test(idempotencyKey)) return NextResponse.json({ code: "IMAGE_INVALID", message: "Envie uma imagem e os campos obrigatórios." }, { status: 400 });
  if (!image.type.startsWith("image/")) return NextResponse.json({ code: "IMAGE_INVALID", message: "Envie um arquivo de imagem." }, { status: 400 });
  if (image.size > 10 * 1024 * 1024) return NextResponse.json({ code: "IMAGE_TOO_LARGE", message: "A imagem deve ter no máximo 10 MB." }, { status: 413 });
  const existing = await supabaseRest<MomentRow[]>(`moments?${query({ select: "id,participation_id,publication_status,moderation_status,points_awarded,captured_at,removal_reason,photo_status,media_objects(storage_key),participations!inner(user_id,test_users(group_id,display_name),experiences(spaces(name)))", idempotency_key: `eq.${idempotencyKey}`, limit: 1 })}`);
  if (existing[0]) {
    await supabaseRest("rpc/dnj_award_moment", { method: "POST", body: JSON.stringify({ p_moment_id: existing[0].id, p_user_id: userId }) });
    return NextResponse.json({ moment: responseMoment(existing[0], [], userId) });
  }
  const [participation] = await supabaseRest<ParticipationForMoment[]>(`participations?${query({ select: "id,can_share_moment,experiences(kind,status,ends_at,moment_points)", id: `eq.${participationId}`, user_id: `eq.${userId}`, limit: 1 })}`);
  if (!participation) return NextResponse.json({ code: "PARTICIPATION_REQUIRED", message: "Participe da atividade antes de publicar um Momento." }, { status: 403 });
  if (participation.experiences?.kind === "moment_challenge" && (participation.experiences.status !== "active" || !participation.experiences.ends_at || new Date(participation.experiences.ends_at).getTime() <= Date.now()))
    return NextResponse.json({ code: "MOMENT_NOT_ELIGIBLE", message: "O tempo deste desafio já terminou." }, { status: 409 });
  if (participation.experiences?.kind === "moment_challenge") {
    const [moment] = await supabaseRest<Array<{ id: string }>>(`moments?${query({ select: "id", participation_id: `eq.${participation.id}`, limit: 1 })}`);
    if (moment) return NextResponse.json({ code: "MOMENT_ALREADY_CREATED", message: "Você já enviou uma foto para este desafio." }, { status: 409 });
  }
  const storageKey = `private/${userId}/${randomUUID()}.${image.type === "image/png" ? "png" : "jpg"}`;
  await supabaseStorage(`object/dnj-moments/${storageKey}`, { method: "POST", headers: { "Content-Type": image.type, "x-upsert": "false" }, body: image });
  const [media] = await supabaseRest<Array<{ id: string }>>("media_objects", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ owner_user_id: userId, storage_key: storageKey, content_type: image.type, bytes: image.size }) });
  if (!media) return NextResponse.json({ code: "IMAGE_INVALID", message: "Não foi possível registrar a imagem." }, { status: 503 });
  const [created] = await supabaseRest<MomentRow[]>("moments", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ participation_id: participation.id, media_object_id: media.id, publication_status: publishConsent ? "public" : "private", moderation_status: "approved", points_awarded: publishConsent && participation.can_share_moment ? participation.experiences?.moment_points ?? 0 : 0, idempotency_key: idempotencyKey }) });
  if (!created) return NextResponse.json({ code: "IMAGE_INVALID", message: "Não foi possível salvar o Momento." }, { status: 503 });
  await supabaseRest("rpc/dnj_award_moment", { method: "POST", body: JSON.stringify({ p_moment_id: created.id, p_user_id: userId }) });
  return NextResponse.json({ moment: responseMoment(created, [], userId) }, { status: 201 });
}
