import { mockExperienceRepositories as repositories } from "@/lib/mocks/mock-experience-store";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const eventId = url.searchParams.get("eventId");
  if (!eventId) return Response.json({ code: "IMAGE_INVALID", message: "eventId é obrigatório." }, { status: 400 });
  const page = await repositories.gallery.list({
    eventId,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: Number(url.searchParams.get("limit") ?? 20),
    placeId: url.searchParams.get("placeId") ?? undefined,
  });
  return Response.json(page);
}
