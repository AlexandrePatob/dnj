import { NextResponse } from "next/server";
import { manager, ownActivityRun, supabaseRest } from "@/lib/manager-api";
const placement: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  participation: 4,
};
export async function POST(request: Request) {
  const auth = manager(request, "radicality");
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as {
    runId?: string;
    results?: Array<{ participantId?: string; result?: string }>;
  } | null;
  if (!body?.runId || !Array.isArray(body.results))
    return Response.json({ error: "Resultados inválidos." }, { status: 400 });
  const run = await ownActivityRun(auth.session.sub, body.runId);
  if (!run)
    return Response.json({ error: "Partida não encontrada." }, { status: 404 });
  if (!["active", "paused", "results"].includes(run.status))
    return Response.json(
      { error: "A partida não está pronta para pontuação." },
      { status: 409 },
    );
  const result = await supabaseRest<{ ok: boolean; code?: string }>(
    "rpc/dnj_finalize_activity_run_v2",
    {
      method: "POST",
      body: JSON.stringify({
        p_manager_id: auth.session.sub,
        p_run_id: body.runId,
        p_placements: body.results
          .filter((item) => item.participantId && placement[item.result ?? ""])
          .map((item) => ({
            userId: item.participantId,
            placement: placement[item.result!],
          })),
      }),
    },
  );
  return result.ok
    ? NextResponse.json(result)
    : Response.json(
        { error: "Não foi possível pontuar esta partida." },
        { status: result.code === "FORBIDDEN" ? 403 : 409 },
      );
}
