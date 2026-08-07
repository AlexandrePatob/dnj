import { NextResponse } from "next/server";
import { SIMULATED_SMS_CODE } from "../sms/route";

function validRequest(value: unknown): value is { email: string; document: string; verificationCode: string } {
  if (!value || typeof value !== "object") return false;
  const { email, document, verificationCode } = value as { email?: unknown; document?: unknown; verificationCode?: unknown };
  return typeof email === "string" && email.includes("@") && typeof document === "string" && document.replace(/\D/g, "").length === 11 && typeof verificationCode === "string";
}

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!validRequest(body)) return NextResponse.json({ message: "Dados de verificação inválidos." }, { status: 400 });
  if (body.verificationCode !== SIMULATED_SMS_CODE) return NextResponse.json({ message: "Código SMS inválido. Use o código exibido na tela de homologação." }, { status: 401 });

  return NextResponse.json({
    id: `homolog-${body.document.replace(/\D/g, "")}`,
    email: body.email,
    name: "João Paulo",
    mobilePhone: "41999999999",
    document: body.document.replace(/\D/g, ""),
    role: "DEFAULT",
    group: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    identityToken: "homologation-sms-token",
  });
}
