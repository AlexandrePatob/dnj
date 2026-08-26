import { cookies } from "next/headers";
import { env } from "@/lib/env";

export type OperationalIdentity = { user?: { id?: string; email?: string; name?: string; role?: string } };

export async function validateAccessToken(accessToken: string) {
  const response = await fetch(`${env.v2UpstreamUrl}/auth/session`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const identity = await response.json().catch(() => null) as OperationalIdentity | null;
  return { response, identity };
}

export async function readOperationalToken(name: string) {
  return (await cookies()).get(name)?.value;
}
