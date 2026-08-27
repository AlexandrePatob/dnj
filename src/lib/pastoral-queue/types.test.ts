import { describe, expect, it } from "vitest";
import {
  DEFAULT_QUEUE_CONFIG,
  NOTIFICATION_MILESTONES,
  PASTORAL_ENTRY_STATUSES,
  PASTORAL_QUEUE_TYPES,
  isQueueConfig,
  isTerminalEntryStatus,
  nextOperationalTransitions,
  notificationIntentId,
} from "./types";

describe("pastoral queue domain model", () => {
  it("represents the two queue types, five entry states and three notification milestones", () => {
    expect(PASTORAL_QUEUE_TYPES).toEqual(["confession", "spiritual"]);
    expect(PASTORAL_ENTRY_STATUSES).toEqual(["queued", "called", "completed", "no_show", "cancelled"]);
    expect(NOTIFICATION_MILESTONES).toEqual(["position_10", "position_5", "called"]);
  });

  it("keeps configuration limited to valid global fields and bounded delay", () => {
    expect(Object.keys(DEFAULT_QUEUE_CONFIG).sort()).toEqual([
      "almostTherePosition",
      "isQueueOpen",
      "notificationDelay",
      "pushEnabled",
      "whatsAppEnabled",
    ]);
    expect(isQueueConfig(DEFAULT_QUEUE_CONFIG)).toBe(true);
    expect(isQueueConfig({ ...DEFAULT_QUEUE_CONFIG, notificationDelay: -1 })).toBe(false);
    expect(isQueueConfig({ ...DEFAULT_QUEUE_CONFIG, notificationDelay: 301 })).toBe(false);
    expect(isQueueConfig({ ...DEFAULT_QUEUE_CONFIG, notificationDelay: 1.5 })).toBe(false);
  });

  it("does not expose operational transitions for terminal states", () => {
    expect(isTerminalEntryStatus("completed")).toBe(true);
    expect(isTerminalEntryStatus("no_show")).toBe(true);
    expect(isTerminalEntryStatus("cancelled")).toBe(true);
    expect(nextOperationalTransitions("completed")).toEqual([]);
    expect(nextOperationalTransitions("no_show")).toEqual([]);
    expect(nextOperationalTransitions("cancelled")).toEqual([]);
    expect(nextOperationalTransitions("queued")).toEqual(["called", "cancelled"]);
  });

  it("creates stable and distinct intent IDs per entry and milestone", () => {
    expect(notificationIntentId("entry-1", "position_10")).toBe("entry-1_position_10");
    expect(notificationIntentId("entry-1", "position_10")).toBe(notificationIntentId("entry-1", "position_10"));
    expect(notificationIntentId("entry-1", "position_10")).not.toBe(notificationIntentId("entry-1", "position_5"));
    expect(notificationIntentId("entry-1", "position_10")).not.toBe(notificationIntentId("entry-2", "position_10"));
  });
});
