import { apiMutation } from "@/lib/api/client";
import type { Moment } from "@/types/experience";
type Intent = { id: string; uploadUrl: string; method: "PUT"; headers: Record<string, string>; expiresAt: string };
export type PublishProgress = "hashing" | "requesting_intent" | "uploading" | "completing" | "publishing" | "success" | "error";
async function checksum(file: File) { const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer()); return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
export async function publishMoment(input: { file: File; participationId?: string; publishConsent: boolean; onProgress?: (state: PublishProgress) => void }): Promise<Moment> {
  if (!/image\/(jpeg|png)/.test(input.file.type) || input.file.size > 10 * 1024 * 1024) throw new Error("A imagem deve ser JPEG ou PNG de até 10 MiB.");
  input.onProgress?.("hashing"); const sha256 = await checksum(input.file); input.onProgress?.("requesting_intent");
  const intent = await apiMutation<Intent>("/media/upload-intents", { method: "POST", body: { fileName: input.file.name, contentType: input.file.type, size: input.file.size, checksum: sha256 } });
  input.onProgress?.("uploading"); const uploaded = await fetch(intent.uploadUrl, { method: intent.method, headers: intent.headers, body: input.file }); if (!uploaded.ok) throw new Error("Não foi possível enviar a imagem.");
  input.onProgress?.("completing"); let complete: { assetId: string }; try { complete = await apiMutation<{ assetId: string }>(`/media/upload-intents/${intent.id}/complete`, { method: "POST", body: {} }); } catch (error) { if ((error as { code?: string }).code !== "UPLOAD_INCOMPLETE") throw error; complete = await apiMutation<{ assetId: string }>(`/media/upload-intents/${intent.id}/complete`, { method: "POST", body: {} }); }
  input.onProgress?.("publishing"); return apiMutation<Moment>("/moments", { method: "POST", body: { assetId: complete.assetId, participationId: input.participationId, publishConsent: input.publishConsent } });
}
