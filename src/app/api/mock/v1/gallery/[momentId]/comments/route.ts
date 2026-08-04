import { mockExperienceRepositories as repositories } from "@/lib/mocks/mock-experience-store";

export async function POST(request: Request, { params }: { params: Promise<{ momentId: string }> }) {
  if (!request.headers.get("authorization")) return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const payload = await request.json().catch(() => null) as { body?: unknown } | null;
  if (typeof payload?.body !== "string" || !payload.body.trim()) return Response.json({ code: "IMAGE_INVALID", message: "Escreva um comentário antes de enviar." }, { status: 400 });
  try {
    return Response.json(await repositories.gallery.addComment((await params).momentId, payload.body), { status: 201 });
  } catch (error) {
    const domain = error as { message?: string };
    return Response.json({ code: "IMAGE_INVALID", message: domain.message ?? "Momento não encontrado." }, { status: 404 });
  }
}
