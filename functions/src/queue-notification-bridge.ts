export type QueueCalledPayload = {
  queueId: string;
  entryId: string;
  participantUserId: string;
  calledAt: string;
};

type QueueCalledDocument = {
  status?: unknown;
  queueType?: unknown;
  phone?: unknown;
  calledAt?: unknown;
};

type FetchLike = (input: string, init: RequestInit) => Promise<{ok: boolean; status: number}>;

export function queueCalledPayload(entryId: string, value: QueueCalledDocument): QueueCalledPayload | null {
  if (value.status !== "called" || typeof value.queueType !== "string" || typeof value.phone !== "string") return null;
  const calledAt = toIso(value.calledAt);
  return calledAt ? {queueId: value.queueType, entryId, participantUserId: value.phone, calledAt} : null;
}

export async function dispatchQueueCalledNotification(
  baseUrl: string,
  token: string,
  payload: QueueCalledPayload,
  fetcher: FetchLike = fetch,
): Promise<void> {
  const response = await fetcher(`${baseUrl.replace(/\/$/, "")}/internal/notifications/queue-called`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `queue-called:${payload.queueId}:${payload.entryId}`,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(`V2 queue notification bridge failed (${response.status}).`);
}

function toIso(value: unknown): string | null {
  const date = value instanceof Date ? value :
    value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function" ? value.toDate() :
    value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function" ? new Date(value.toMillis()) :
    typeof value === "string" ? new Date(value) : null;
  return date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}
