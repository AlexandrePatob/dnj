import { NextResponse } from "next/server";
import { manager, ownActivityRun, supabaseRest } from "@/lib/manager-api";
export async function POST(request: Request) {
  const auth = manager(request, "radicality");
  if ("error" in auth) return auth.error;
  const { runId } = (await request.json()) as { runId?: string };
  if (!runId)
    return Response.json({ error: "Partida inválida." }, { status: 400 });
  const run = await ownActivityRun(auth.session.sub, runId);
  if (!run)
    return Response.json({ error: "Partida não encontrada." }, { status: 404 });
  if (["completed", "cancelled"].includes(run.status))
    return NextResponse.json({ ok: true, alreadyClosed: true });
  if (!["draft", "active", "paused", "results"].includes(run.status))
    return Response.json(
      { error: "A partida não pode ser cancelada neste estado." },
      { status: 409 },
    );
  await Promise.all([
    supabaseRest(
      `activity_runs?id=eq.${runId}&started_by=eq.${auth.session.sub}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status: "cancelled",
          ended_at: new Date().toISOString(),
        }),
      },
    ),
    supabaseRest(`qr_codes?activity_run_id=eq.${runId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "disabled" }),
    }),
  ]);
  return NextResponse.json({ ok: true });
}
