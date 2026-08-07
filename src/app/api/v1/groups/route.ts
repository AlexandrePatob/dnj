import { NextResponse } from "next/server";
import { currentDnjEventId } from "@/lib/dnj-event";
import { query, supabaseRest } from "@/lib/supabase-server";

type DbGroup = { id: string; name: string };

export async function GET(request: Request) {
  const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
  const eventId = await currentDnjEventId();
  const groups = await supabaseRest<DbGroup[]>(`groups?${query({ select: "id,name", event_id: `eq.${eventId}`, order: "name.asc", name: search ? `ilike.*${search.replace(/[,*()]/g, "")}*` : undefined, limit: 20 })}`);
  return NextResponse.json(groups.map((group) => ({ id: group.id, groupName: group.name })));
}
