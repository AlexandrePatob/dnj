import { mockExperienceRepositories as repositories } from "@/lib/mocks/mock-experience-store";
import type { ExperienceError } from "@/types/experience";

const statusByCode: Record<ExperienceError["code"], number> = {
  UNAUTHENTICATED: 401,
  QR_INVALID: 400,
  QR_EXPIRED: 410,
  QR_ALREADY_USED: 409,
  QR_OTHER_EVENT: 403,
  COOLDOWN_ACTIVE: 409,
  PARTICIPATION_REQUIRED: 403,
  MOMENT_ALREADY_CREATED: 409,
  IMAGE_INVALID: 400,
  IMAGE_TOO_LARGE: 413,
  CONSENT_REQUIRED: 422,
  RATE_LIMITED: 429,
  OFFLINE: 503,
  TIMEOUT: 504,
};

export async function POST(request: Request) {
  if (!request.headers.get("authorization")) {
    return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.qrToken !== "string" || typeof body.idempotencyKey !== "string") {
    return Response.json({ code: "QR_INVALID", message: "Envie um QR Code válido." }, { status: 400 });
  }

  try {
    const participation = await repositories.participation.validateQr(body);
    return Response.json({ participation }, { status: 201 });
  } catch (error) {
    const experienceError = error as ExperienceError;
    return Response.json(experienceError, { status: statusByCode[experienceError.code] ?? 500 });
  }
}
