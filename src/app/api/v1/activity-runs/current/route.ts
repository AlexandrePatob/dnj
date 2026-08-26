import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { query, supabaseRest } from "@/lib/supabase-server";

type RunRow = {
  activity_run_id: string;
  activity_runs: {
    id: string;
    status:
      "draft" | "active" | "paused" | "results" | "completed" | "cancelled";
    experiences: { name: string } | null;
  } | null;
};

export async function GET(request: Request) {
  const userId = participantIdFrom(request);
  if (!userId)
    return NextResponse.json(
      { code: "UNAUTHENTICATED", message: "Entre novamente para continuar." },
      { status: 401 },
    );
  const url = new URL(request.url);
  const runId = url.searchParams.get("runId")?.trim();
  const [row] = await supabaseRest<RunRow[]>(
    `activity_run_participants?${query({ select: "activity_run_id,activity_runs!inner(id,status,experiences(name))", user_id: `eq.${userId}`, ...(runId ? { activity_run_id: `eq.${runId}` } : { "activity_runs.status": "in.(draft,active,paused,results)" }), order: "created_at.desc", limit: 1 })}`,
  );
  if (!row?.activity_runs) return new Response(null, { status: 204 });
  return NextResponse.json({
    run: {
      id: row.activity_runs.id,
      status: row.activity_runs.status,
      gameName: row.activity_runs.experiences?.name ?? "Radicalidade",
    },
  });
}
