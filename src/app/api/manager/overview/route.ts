import { NextResponse } from "next/server";
import { manager, query, supabaseRest } from "@/lib/manager-api";

type Experience = {
  id: string;
  name: string;
  starts_at: string | null;
  actual_started_at: string | null;
  status: string;
  flex_minutes: number;
  spaces: { name: string } | null;
};
type Game = { id: string; name: string; point_rules?: Record<string, number> };
type Run = {
  id: string;
  status: string;
  created_at: string;
  point_rules: Record<string, number>;
  experiences: { id: string; name: string } | null;
  activity_run_participants: Array<{
    placement: number | null;
    created_at: string;
    test_users: { id: string; display_name: string } | null;
  }>;
};
type Special = {
  id: string;
  title: string;
  points: number;
  status: string;
  ends_at: string;
  teaser_seconds: number;
  teaser_started_at: string | null;
  delivery_targets: string[];
};

export async function GET(request: Request) {
  const auth = manager(request);
  if ("error" in auth) return auth.error;
  if (auth.session.scope === "space_timer") {
    const scopes = await supabaseRest<Array<{ space_id: string }>>(
      `manager_scopes?${query({ select: "space_id", user_id: `eq.${auth.session.sub}`, scope: "eq.space_timer" })}`,
    );
    const ids = scopes.map((scope) => scope.space_id).filter(Boolean);
    const rows = ids.length
      ? await supabaseRest<Experience[]>(
          `experiences?${query({ select: "id,name,starts_at,actual_started_at,status,flex_minutes,spaces(name)", space_id: `in.(${ids.join(",")})`, kind: "eq.schedule", order: "starts_at.asc" })}`,
        )
      : [];
    const open = rows.filter((row) => row.status !== "completed");
    const map = (row: Experience) => ({
      id: row.id,
      title: row.name,
      startsAt: row.starts_at ?? undefined,
      startedAt: row.actual_started_at ?? undefined,
      status: row.status,
      flexMinutes: row.flex_minutes,
      spaceName: row.spaces?.name,
    });
    return NextResponse.json({
      scope: "space",
      space: {
        current: open[0] ? map(open[0]) : null,
        upcoming: open.slice(1, 6).map(map),
      },
    });
  }
  if (auth.session.scope === "radicality") {
    const games = await supabaseRest<Game[]>(
      `experiences?${query({ select: "id,name", kind: "eq.activity", slug: "like.radicalidade-*", status: "eq.active", order: "name.asc" })}`,
    );
    const [run] = await supabaseRest<Run[]>(
      `activity_runs?${query({ select: "id,status,created_at,point_rules,experiences(id,name),activity_run_participants(placement,created_at,test_users(id,display_name))", started_by: `eq.${auth.session.sub}`, status: "in.(draft,active,paused,results)", order: "created_at.desc", limit: 1 })}`,
    );
    return NextResponse.json({
      scope: "actions",
      actions: {
        games: games.map((game) => ({ id: game.id, name: game.name })),
        run: run
          ? {
              id: run.id,
              gameId: run.experiences?.id,
              gameName: run.experiences?.name,
              status:
                run.status === "draft"
                  ? "checkin"
                  : run.status === "active"
                    ? "running"
                    : run.status,
              participants: run.activity_run_participants.map(
                (participant) => ({
                  id: participant.test_users?.id,
                  name: participant.test_users?.display_name ?? "Participante",
                  checkedInAt: participant.created_at,
                  result:
                    participant.placement === 1
                      ? "first"
                      : participant.placement === 2
                        ? "second"
                        : participant.placement === 3
                          ? "third"
                          : "participation",
                }),
              ),
            }
          : null,
      },
    });
  }
  const events = await supabaseRest<Special[]>(
    `special_events?${query({ select: "id,title,points,status,ends_at,teaser_seconds,teaser_started_at,delivery_targets", or: `(created_by.is.null,created_by.eq.${auth.session.sub})`, order: "created_at.desc", limit: 20 })}`,
  );
  return NextResponse.json({
    scope: "special_events",
    specialEvents: {
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        points: event.points,
        status: event.status,
        expiresAt: event.ends_at,
        targets: event.delivery_targets,
      })),
    },
  });
}
