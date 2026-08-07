import { NextResponse } from "next/server";
import {
  manager,
  ownActivityRun,
  query,
  supabaseRest,
  token,
  tokenHash,
} from "@/lib/manager-api";
import { qrImageUrl } from "@/lib/manager-qr";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const auth = manager(request, "radicality");
  if ("error" in auth) return auth.error;
  const { runId } = await params;
  const run = await ownActivityRun(auth.session.sub, runId);
  if (!run || run.status !== "draft")
    return Response.json(
      { error: "Partida não está disponível." },
      { status: 404 },
    );
  await supabaseRest(
    `qr_codes?${query({ activity_run_id: `eq.${run.id}`, status: "eq.active" })}`,
    { method: "PATCH", body: JSON.stringify({ status: "disabled" }) },
  );
  const qrPayload = token();
  const [qr] = await supabaseRest<
    Array<{ id: string; expiration_time: string }>
  >("qr_codes", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      experience_id: run.experience_id,
      activity_run_id: run.id,
      token_hash: tokenHash(qrPayload),
      expiration_time: new Date(Date.now() + 45 * 60_000).toISOString(),
      expiration_momento_time: null,
      status: "active",
    }),
  });
  return NextResponse.json({
    runId: run.id,
    qrId: qr?.id,
    qrPayload,
    qrImageUrl: await qrImageUrl(qrPayload),
    expiresAt: qr?.expiration_time,
  });
}
