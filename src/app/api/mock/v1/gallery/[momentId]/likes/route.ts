import { mockExperienceRepositories as repositories } from "@/lib/mocks/mock-experience-store";

export async function POST(request: Request, { params }: { params: Promise<{ momentId: string }> }) {
  if (!request.headers.get("authorization")) return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  try {
    return Response.json(await repositories.gallery.toggleLike((await params).momentId));
  } catch (error) {
    const domain = error as { message?: string };
    return Response.json({ code: "IMAGE_INVALID", message: domain.message ?? "Momento não encontrado." }, { status: 404 });
  }
}
