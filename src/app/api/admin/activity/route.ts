import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { adminCookie, verifyAdminCookie } from "@/lib/admin-session";
import { query, supabaseRest } from "@/lib/supabase-server";
export async function GET() {
 if (!verifyAdminCookie((await cookies()).get(adminCookie.name)?.value)) return NextResponse.json({error:"Não autorizado"},{status:401});
 try { const activity=await supabaseRest<Array<{id:number;event_type:string;created_at:string;test_users:{display_name:string}|null}>>(`operation_events?${query({select:"id,event_type,created_at,test_users(display_name)",order:"created_at.desc",limit:100})}`); return NextResponse.json({activity}); } catch {return NextResponse.json({error:"Atividade indisponível."},{status:503});}
}
