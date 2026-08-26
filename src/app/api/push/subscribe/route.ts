import { NextResponse } from "next/server";

const defaultUpstream = "https://ttwkfudhvvhuhp5yvsoydxggum0ictpg.lambda-url.sa-east-1.on.aws/v2";

export async function POST(request: Request) {
  const body = await request.json() as {
    externalKey?: string;
    subscription?: PushSubscriptionJSON;
  };
  if (!body.externalKey || !body.subscription?.endpoint || !body.subscription.keys?.p256dh || !body.subscription.keys.auth) {
    return NextResponse.json({ error: "Inscrição inválida." }, { status: 400 });
  }

  try {
    const upstream = (process.env.DNJ_V2_UPSTREAM_URL ?? defaultUpstream).replace(/\/$/, "");
    const response = await fetch(`${upstream}/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const result = await response.text();
    return new NextResponse(result || JSON.stringify({ ok: response.ok }), {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" },
    });
  } catch {
    return NextResponse.json({ error: "Não foi possível ativar notificações." }, { status: 503 });
  }
}
