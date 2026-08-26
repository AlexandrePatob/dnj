import { NextResponse } from "next/server";
import { participantIdFrom } from "@/lib/participant-session";
import { query, supabaseRest } from "@/lib/supabase-server";

export async function POST(request: Request, { params }: { params: Promise<{ momentId: string }> }) {
  const userId = participantIdFrom(request);
  if (!userId) return NextResponse.json({ code: "UNAUTHENTICATED", message: "Entre novamente para continuar." }, { status: 401 });
  const momentId = (await params).momentId;
  const [existing] = await supabaseRest<Array<{ moment_id: string }>>(`moment_likes?${query({ select: "moment_id", moment_id: `eq.${momentId}`, user_id: `eq.${userId}`, limit: 1 })}`);
  if (existing) await supabaseRest(`moment_likes?${query({ moment_id: `eq.${momentId}`, user_id: `eq.${userId}` })}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
  else await supabaseRest("moment_likes", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ moment_id: momentId, user_id: userId }) });
  return NextResponse.json({ likedByCurrentUser: !existing });
}

