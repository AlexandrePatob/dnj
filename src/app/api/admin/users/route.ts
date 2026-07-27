import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";
export async function GET() {
  if (!verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  try { const users = await supabaseRest<Array<{ id:string; display_name:string; email:string|null; points:number; last_seen_at:string }>>(`test_users?${query({ select:"id,display_name,email,points,last_seen_at", order:"points.desc,last_seen_at.desc", limit:100 })}`); return NextResponse.json({ users }); } catch { return NextResponse.json({ error:"Usuários indisponíveis." },{status:503}); }
}
