export const MODERATION_ACTIONS = ["deny_points", "delete_photo"] as const;

export type ModerationAction = typeof MODERATION_ACTIONS[number];

export interface ModerationOutcome {
  publicationStatus: "public" | "private";
  moderationStatus: "approved" | "rejected";
  rewardStatus: "awarded" | "denied";
  photoStatus: "available" | "deleted";
  shouldDeleteStorageObject: boolean;
}

export function isModerationAction(value: unknown): value is ModerationAction {
  return typeof value === "string" && MODERATION_ACTIONS.includes(value as ModerationAction);
}

export function moderationOutcome(action: ModerationAction): ModerationOutcome {
  return {
    publicationStatus: "private",
    moderationStatus: "rejected",
    rewardStatus: "denied",
    photoStatus: action === "delete_photo" ? "deleted" : "available",
    shouldDeleteStorageObject: action === "delete_photo",
  };
}
