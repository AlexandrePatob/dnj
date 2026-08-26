import { NextResponse } from "next/server";
import {
  manager,
  query,
  supabaseRest,
  token,
  tokenHash,
} from "@/lib/manager-api";
import { qrImageUrl } from "@/lib/manager-qr";

export async function POST(request: Request) {
  const auth = manager(request, "radicality");
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as {
    gameId?: unknown;
  } | null;
  if (typeof body?.gameId !== "string")
    return Response.json({ error: "Selecione um jogo." }, { status: 400 });
  const [game] = await supabaseRest<Array<{ id: string }>>(
    `experiences?${query({ select: "id", id: `eq.${body.gameId}`, kind: "eq.activity", slug: "like.radicalidade-*", limit: 1 })}`,
  );
  if (!game)
    return Response.json({ error: "Jogo não encontrado." }, { status: 404 });
  const [run] = await supabaseRest<Array<{ id: string }>>("activity_runs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      experience_id: game.id,
      started_by: auth.session.sub,
      status: "draft",
    }),
  });
  if (!run)
    return Response.json(
      { error: "Não foi possível criar a partida." },
      { status: 503 },
    );
  const qrPayload = token();
  const [qr] = await supabaseRest<
    Array<{ id: string; expiration_time: string }>
  >("qr_codes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      experience_id: game.id,
      activity_run_id: run.id,
      token_hash: tokenHash(qrPayload),
      expiration_time: new Date(Date.now() + 45 * 60_000).toISOString(),
      expiration_momento_time: null,
      status: "active",
    }),
  });
  return NextResponse.json(
    {
      runId: run.id,
      qrId: qr?.id,
      qrPayload,
      qrImageUrl: await qrImageUrl(qrPayload),
      expiresAt: qr?.expiration_time,
    },
    { status: 201 },
  );
}
