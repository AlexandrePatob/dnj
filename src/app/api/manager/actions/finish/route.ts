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
  if (!["active", "paused"].includes(run.status))
    return Response.json(
      { error: "A partida não pode ser encerrada neste estado." },
      { status: 409 },
    );
  await supabaseRest(
    `activity_runs?id=eq.${runId}&started_by=eq.${auth.session.sub}`,
    {
      method: "PATCH",
      body: JSON.stringify({ status: "results" }),
    },
  );
  return NextResponse.json({ ok: true });
}
