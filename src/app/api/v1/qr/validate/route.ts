import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { supabaseRest } from "@/lib/supabase-server";
import type { Participation } from "@/types/experience";

type QrResult = { ok: boolean; code?: "QR_INVALID" | "QR_EXPIRED" | "QR_LIMIT_REACHED" | "COOLDOWN_ACTIVE" | "UNAUTHENTICATED"; created?: boolean; newTotalPoints?: number; participation?: Participation };
const statuses: Record<NonNullable<QrResult["code"]>, number> = { QR_INVALID: 400, QR_EXPIRED: 410, QR_LIMIT_REACHED: 409, COOLDOWN_ACTIVE: 409, UNAUTHENTICATED: 401 };
const messages: Record<Exclude<NonNullable<QrResult["code"]>, "UNAUTHENTICATED">, string> = {
  QR_INVALID: "Este QR Code não está disponível.",
  QR_EXPIRED: "O prazo para este QR Code terminou.",
  QR_LIMIT_REACHED: "Este QR Code atingiu o limite de usos.",
  COOLDOWN_ACTIVE: "Você já participou desta atividade. Aguarde o tempo de espera.",
};

export async function POST(request: Request) {
  const userId = participantIdFrom(request);
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const body = await request.json().catch(() => null) as { qrToken?: unknown; idempotencyKey?: unknown } | null;
  if (typeof body?.qrToken !== "string" || !body.qrToken.trim() || typeof body.idempotencyKey !== "string" || !/^[0-9a-f-]{36}$/i.test(body.idempotencyKey)) return NextResponse.json({ code: "QR_INVALID", message: "Envie um QR Code válido." }, { status: 400 });
  const result = await supabaseRest<QrResult>("rpc/validate_dnj_qr", {
    method: "POST",
    body: JSON.stringify({ p_user_id: userId, p_token_hash: createHash("sha256").update(body.qrToken.trim()).digest("hex"), p_idempotency_key: body.idempotencyKey }),
  });
  if (!result.ok || !result.participation || result.newTotalPoints === undefined) {
    const code = result.code ?? "QR_INVALID";
    return NextResponse.json({ code, message: code === "UNAUTHENTICATED" ? "Participante não encontrado." : messages[code as Exclude<typeof code, "UNAUTHENTICATED">] }, { status: statuses[code] });
  }
  return NextResponse.json({ participation: { ...result.participation, newTotalPoints: result.newTotalPoints } }, { status: result.created ? 201 : 200 });
}
