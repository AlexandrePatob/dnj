import { mockExperienceRepositories as repositories } from "@/lib/mocks/mock-experience-store";
import type { MomentScope } from "@/types/experience";

const validScopes: MomentScope[] = ["feed", "mine", "group"];

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") as MomentScope | null;
  if (!scope || !validScopes.includes(scope)) return Response.json({ code: "IMAGE_INVALID", message: "scope deve ser feed, mine ou group." }, { status: 400 });
  if (scope !== "feed" && !request.headers.get("authorization")) return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const page = await repositories.gallery.list({ scope, eventId: "event_dnj_curitiba_2026", cursor: url.searchParams.get("cursor") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 20) });
  return Response.json(page);
}

export async function POST(request: Request) {
  if (!request.headers.get("authorization")) {
    return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  }

  const data = await request.formData();
  const participationId = data.get("participationId");
  const image = data.get("image");
  const publishConsent = data.get("publishConsent") === "true";
  const idempotencyKey = data.get("idempotencyKey");
  if (typeof participationId !== "string" || typeof idempotencyKey !== "string" || !(image instanceof Blob)) {
    return Response.json({ code: "IMAGE_INVALID", message: "Envie uma imagem e os campos obrigatórios." }, { status: 400 });
  }

  try {
    const moment = await repositories.moment.create({ participationId, image, publishConsent, idempotencyKey });
    return Response.json({ moment }, { status: 201 });
  } catch (error) {
    const domain = error as { code?: string; message?: string };
    const status = domain.code === "CONSENT_REQUIRED" ? 422 : domain.code === "PARTICIPATION_REQUIRED" ? 403 : 409;
    return Response.json({ code: domain.code ?? "IMAGE_INVALID", message: domain.message ?? "Não foi possível criar o momento." }, { status });
  }
}
