import { NextResponse } from "next/server";
import { currentDnjEventId } from "@/lib/dnj-event";
import { query, supabaseRest } from "@/lib/supabase-server";

type DbSpace = { id: string; name: string; slug: string; map_reference: string | null };

export async function GET() {
  const eventId = await currentDnjEventId();
  const spaces = await supabaseRest<DbSpace[]>(`spaces?${query({ select: "id,name,slug,map_reference", event_id: `eq.${eventId}`, order: "name.asc" })}`);
  return NextResponse.json(spaces.map((space) => ({ id: space.id, name: space.name, slug: space.slug, mapReference: space.map_reference })));
}
