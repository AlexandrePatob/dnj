import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { eventId, manager, query, supabaseRest } from "@/lib/manager-api";

export async function POST(request: Request) {
  const auth = manager(request, "radicality");
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  if (
    typeof body?.name !== "string" ||
    !body.name.trim() ||
    body.name.trim().length > 80
  )
    return Response.json({ error: "Informe o nome do jogo." }, { status: 400 });
  const [space] = await supabaseRest<Array<{ id: string }>>(
    `spaces?${query({ select: "id", slug: "eq.espaco-radicalidade", limit: 1 })}`,
  );
  const id = await eventId();
  if (!space || !id)
    return Response.json({ error: "Evento não configurado." }, { status: 503 });
  const [game] = await supabaseRest<Array<{ id: string; name: string }>>(
    "experiences",
    {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        event_id: id,
        space_id: space.id,
        slug: `radicalidade-${randomUUID()}`,
        name: body.name.trim(),
        kind: "activity",
        check_in_points: 0,
        allows_moment: false,
        status: "active",
      }),
    },
  );
  return NextResponse.json({ game }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = manager(request, "radicality");
  if ("error" in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as {
    gameId?: unknown;
    name?: unknown;
  } | null;
  if (
    typeof body?.gameId !== "string" ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.name.trim().length > 80
  )
    return Response.json({ error: "Informe o nome do jogo." }, { status: 400 });
  const [game] = await supabaseRest<Array<{ id: string; name: string }>>(
    `experiences?${query({ select: "id,name", id: `eq.${body.gameId}`, kind: "eq.activity", slug: "like.radicalidade-*", limit: 1 })}`,
  );
  if (!game)
    return Response.json({ error: "Jogo não encontrado." }, { status: 404 });
  const [updated] = await supabaseRest<Array<{ id: string; name: string }>>(
    `experiences?${query({ id: `eq.${game.id}` })}`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ name: body.name.trim() }),
    },
  );
  return NextResponse.json({ game: updated });
}
