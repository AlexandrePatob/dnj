import { NextResponse } from "next/server";
export function GET() { const key = process.env.VAPID_PUBLIC_KEY; return key ? NextResponse.json({ key }) : NextResponse.json({ error: "Push indisponível." }, { status: 503 }); }
