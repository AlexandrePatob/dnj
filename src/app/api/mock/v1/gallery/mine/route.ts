import { createMockExperienceRepositories } from "@/lib/mocks/mock-experience-repositories";

const repositories = createMockExperienceRepositories();

export async function GET(request: Request) {
  if (!request.headers.get("authorization")) {
    return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  }
  const url = new URL(request.url);
  const page = await repositories.gallery.listMine({ cursor: url.searchParams.get("cursor") ?? undefined, limit: Number(url.searchParams.get("limit") ?? 20) });
  return Response.json(page);
}
