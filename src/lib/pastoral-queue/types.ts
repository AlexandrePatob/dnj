import type { Timestamp } from "firebase/firestore";

export const PASTORAL_QUEUE_TYPES = ["confession", "spiritual"] as const;
export type PastoralQueueType = (typeof PASTORAL_QUEUE_TYPES)[number];

export const PASTORAL_ENTRY_STATUSES = ["queued", "called", "completed", "no_show", "cancelled"] as const;
export type PastoralEntryStatus = (typeof PASTORAL_ENTRY_STATUSES)[number];

export const NOTIFICATION_MILESTONES = ["position_10", "position_5", "called"] as const;
export type NotificationMilestone = (typeof NOTIFICATION_MILESTONES)[number];

export interface QueueEntry {
  id: string;
  participantId: string;
  participantName: string;
  type: PastoralQueueType;
  status: PastoralEntryStatus;
  createdAt: Timestamp;
  calledAt?: Timestamp;
  resolvedAt?: Timestamp;
  resolvedBy?: { id: string; name: string };
  notificationMilestones: Partial<Record<NotificationMilestone, true>>;
}

export interface ParticipantQueueState {
  activeEntryId?: string;
  activeType?: PastoralQueueType;
  completedTypes: Partial<Record<PastoralQueueType, Timestamp>>;
}

export interface QueueConfig {
  isQueueOpen: boolean;
  pushEnabled: boolean;
  notificationDelay: number;
  whatsAppEnabled?: boolean;
  almostTherePosition: number;
}

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  isQueueOpen: false,
  pushEnabled: true,
  notificationDelay: 30,
  whatsAppEnabled: true,
  almostTherePosition: 10,
};

export interface NotificationIntent {
  id: string;
  entryId: string;
  participantId: string;
  milestone: NotificationMilestone;
  status: "pending" | "delivered" | "failed";
  createdAt: Timestamp;
  deliveredAt?: Timestamp;
}

export const QUEUE_ENTRIES_PATH = "queue";
export const CALLED_PEOPLE_PATH = "calledPeople";
export const QUEUE_CONFIG_PATH = "config/default";

export function firebaseQueueType(type: PastoralQueueType): "confissoes" | "direcao-espiritual" {
  return type === "confession" ? "confissoes" : "direcao-espiritual";
}

export function pastoralQueueType(type: unknown): PastoralQueueType | null {
  return type === "confissoes" ? "confession" : type === "direcao-espiritual" ? "spiritual" : null;
}

export const TERMINAL_ENTRY_STATUSES: readonly PastoralEntryStatus[] = [
  "completed",
  "no_show",
  "cancelled",
];

const NEXT_OPERATIONAL_TRANSITIONS: Record<PastoralEntryStatus, readonly PastoralEntryStatus[]> = {
  queued: ["called", "cancelled"],
  called: ["completed", "no_show"],
  completed: [],
  no_show: [],
  cancelled: [],
};

export function isTerminalEntryStatus(status: PastoralEntryStatus): boolean {
  return TERMINAL_ENTRY_STATUSES.includes(status);
}

export function nextOperationalTransitions(status: PastoralEntryStatus): readonly PastoralEntryStatus[] {
  return NEXT_OPERATIONAL_TRANSITIONS[status];
}

export function notificationIntentId(entryId: string, milestone: NotificationMilestone): string {
  return `${entryId}_${milestone}`;
}

export function isQueueConfig(value: unknown): value is QueueConfig {
  if (!value || typeof value !== "object") return false;
  const config = value as Record<string, unknown>;
  return (
    typeof config.isQueueOpen === "boolean" &&
    typeof config.pushEnabled === "boolean" &&
    typeof config.notificationDelay === "number" &&
    Number.isInteger(config.notificationDelay) &&
    config.notificationDelay >= 0 &&
    config.notificationDelay <= 300 &&
    (config.whatsAppEnabled === undefined || typeof config.whatsAppEnabled === "boolean") &&
    typeof config.almostTherePosition === "number" &&
    Number.isInteger(config.almostTherePosition) &&
    config.almostTherePosition > 0
  );
}
