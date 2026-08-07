import { NextResponse } from "next/server";
import { currentDnjEventId } from "@/lib/dnj-event";
import { qrImageUrl } from "@/lib/manager-qr";
import { query, supabaseRest } from "@/lib/supabase-server";

type Target = "tv" | "screen";
type DbGroup = { id: string; name: string };
type DbUser = {
  id: string;
  display_name: string;
  points: number;
  group_id: string | null;
};
type SpecialEvent = {
  id: string;
  title: string;
  status: "teaser" | "active";
  ends_at: string;
  teaser_seconds: number;
  teaser_started_at: string | null;
  points: number;
  delivery_targets: Target[];
  display_qr_payload: string | null;
};

function targetFrom(request: Request): Target | null {
  const target = new URL(request.url).searchParams.get("target") ?? "tv";
  return target === "tv" || target === "screen" ? target : null;
}

export async function GET(request: Request) {
  const target = targetFrom(request);
  if (!target)
    return NextResponse.json(
      { message: "Destino de tela inválido." },
      { status: 400 },
    );

  try {
    const eventId = await currentDnjEventId();
    const [groups, users, specialEvents] = await Promise.all([
      supabaseRest<DbGroup[]>(
        `groups?${query({ select: "id,name", event_id: `eq.${eventId}`, order: "name.asc" })}`,
      ),
      supabaseRest<DbUser[]>(
        `test_users?${query({ select: "id,display_name,points,group_id", role: "eq.DEFAULT", is_active: "eq.true", order: "points.desc,display_name.asc", limit: 100 })}`,
      ),
      supabaseRest<SpecialEvent[]>(
        `special_events?${query({ select: "id,title,status,ends_at,teaser_seconds,teaser_started_at,points,delivery_targets,display_qr_payload", status: "in.(teaser,active)", order: "created_at.desc", limit: 20 })}`,
      ),
    ]);
    const groupById = new Map(groups.map((group) => [group.id, group.name]));
    const individual = users.map((user) => ({
      id: user.id,
      name: user.display_name,
      points: user.points,
      group: user.group_id
        ? (groupById.get(user.group_id) ?? "Sem grupo")
        : "Sem grupo",
    }));
    const rankedGroups = groups
      .map((group) => {
        const members = users.filter((user) => user.group_id === group.id);
        return {
          id: group.id,
          name: group.name,
          members: members.length,
          points: members.reduce((total, user) => total + user.points, 0),
        };
      })
      .sort(
        (left, right) =>
          right.points - left.points || left.name.localeCompare(right.name),
      );
    const now = Date.now();
    const special = specialEvents.find(
      (event) =>
        event.delivery_targets.includes(target) &&
        new Date(event.ends_at).getTime() > now,
    );
    const readyAt = special?.teaser_started_at
      ? new Date(
          new Date(special.teaser_started_at).getTime() +
            special.teaser_seconds * 1_000,
        ).toISOString()
      : null;

    const isOpen =
      special?.status === "active" ||
      Boolean(readyAt && now >= new Date(readyAt).getTime());
    const qrImage =
      special && isOpen && special.display_qr_payload
        ? await qrImageUrl(special.display_qr_payload)
        : null;

    return NextResponse.json({
      updatedAt: new Date(now).toISOString(),
      rankings: { individual, groups: rankedGroups },
      specialEvent: special
        ? {
            id: special.id,
            title: special.title,
            status: isOpen ? "active" : "teaser",
            points: special.points,
            endsAt: special.ends_at,
            readyAt,
            qrImageUrl: qrImage,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível atualizar a tela ao vivo." },
      { status: 503 },
    );
  }
}
