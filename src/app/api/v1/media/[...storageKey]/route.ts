import { supabaseStorage } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ storageKey: string[] }> }) {
  const key = (await params).storageKey.map(encodeURIComponent).join("/");
  try {
    const source = await supabaseStorage(`object/dnj-moments/${key}`);
    return new Response(source.body, { headers: { "Content-Type": source.headers.get("content-type") ?? "application/octet-stream", "Cache-Control": "private, max-age=300" } });
  } catch {
    return Response.json({ code: "IMAGE_NOT_FOUND", message: "Imagem não encontrada." }, { status: 404 });
  }
}

