import { createMockExperienceRepositories } from "@/lib/mocks/mock-experience-repositories";

const repositories = createMockExperienceRepositories();

export async function GET(request: Request) {
  if (!request.headers.get("authorization")) {
    return Response.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  }

  const participation = await repositories.participation.getCurrent();
  if (!participation) return new Response(null, { status: 204 });
  return Response.json({ participation });
}
