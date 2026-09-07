import { apiMutation, newIdempotencyKey } from "@/lib/api/client";
import type { Moment } from "@/types/experience";
type Intent = {
  id: string;
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string;
};
export type PublishProgress =
  | "hashing"
  | "requesting_intent"
  | "uploading"
  | "completing"
  | "publishing"
  | "success"
  | "error";
const UPLOAD_TIMEOUT_MS = 60_000;
async function checksum(file: File) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    await file.arrayBuffer(),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}
async function uploadMoment(input: {
  file: File;
  publishConsent: boolean;
  onProgress?: (state: PublishProgress) => void;
}) {
  if (
    !/image\/(jpeg|png)/.test(input.file.type) ||
    input.file.size > 10 * 1024 * 1024
  )
    throw new Error("A imagem deve ser JPEG ou PNG de até 10 MiB.");
  input.onProgress?.("hashing");
  const sha256 = await checksum(input.file);
  input.onProgress?.("requesting_intent");
  const intent = await apiMutation<Intent>("/media/upload-intents", {
    method: "POST",
    body: {
      contentType: input.file.type,
      bytes: input.file.size,
      checksumSha256: sha256,
    },
    idempotencyKey: newIdempotencyKey(),
  });
  input.onProgress?.("uploading");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const uploaded = await fetch(intent.uploadUrl, {
      method: intent.method,
      headers: intent.headers,
      body: input.file,
      signal: controller.signal,
    });
    if (!uploaded.ok) throw new Error("Não foi possível enviar a imagem.");
  } catch (error) {
    if (controller.signal.aborted)
      throw new Error("O envio da imagem demorou demais. Tente publicar novamente.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
  input.onProgress?.("completing");
  const completeKey = newIdempotencyKey();
  let complete: { id: string };
  try {
    complete = await apiMutation<{ id: string }>(
      `/media/${intent.id}/complete`,
      { method: "POST", idempotencyKey: completeKey },
    );
  } catch (error) {
    if ((error as { code?: string }).code !== "UPLOAD_INCOMPLETE") throw error;
    complete = await apiMutation<{ id: string }>(
      `/media/${intent.id}/complete`,
      { method: "POST", idempotencyKey: completeKey },
    );
  }
  return complete;
}

export async function publishFreeMoment(input: {
  file: File;
  publishConsent: boolean;
  onProgress?: (state: PublishProgress) => void;
}): Promise<Moment> {
  const complete = await uploadMoment(input);
  input.onProgress?.("publishing");
  return apiMutation<Moment>("/moments", {
    method: "POST",
    body: { mediaAssetId: complete.id, publishConsent: input.publishConsent },
    idempotencyKey: newIdempotencyKey(),
  });
}

export async function publishChallengeMoment(input: {
  file: File;
  publishConsent: boolean;
  onProgress?: (state: PublishProgress) => void;
}): Promise<Moment> {
  const complete = await uploadMoment(input);
  input.onProgress?.("publishing");
  return apiMutation<Moment>("/moments/challenge", {
    method: "POST",
    body: { mediaAssetId: complete.id, publishConsent: input.publishConsent },
    idempotencyKey: newIdempotencyKey(),
  });
}
