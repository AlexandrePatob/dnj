import { query, supabaseRest } from "@/lib/supabase-server";

const eventSlug = "dnj-2k26-curitiba";

export async function currentDnjEventId() {
  const [event] = await supabaseRest<Array<{ id: string }>>(`events?${query({ select: "id", slug: `eq.${eventSlug}`, limit: 1 })}`);
  if (!event) throw new Error("Evento DNJ 2K26 não foi configurado.");
  return event.id;
}
