import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationsApi } from "./notifications";
import { apiMutation, apiRequest } from "./client";

vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn(), newIdempotencyKey: vi.fn(() => "notification-key") }));

describe("notificationsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists notifications with the published page parameter", () => {
    notificationsApi.list(2, "session");
    expect(apiRequest).toHaveBeenCalledWith("/notifications?page=2", { token: "session" });
  });

  it("marks one notification read with an idempotency key", () => {
    notificationsApi.markRead("notice/1", "session", "key-1");
    expect(apiMutation).toHaveBeenCalledWith("/notifications/notice%2F1/read", { method: "POST", token: "session", idempotencyKey: "key-1" });
  });

  it("updates notification preferences idempotently", () => {
    notificationsApi.updatePreferences({ announcementEnabled: false, pointsEnabled: true }, "session", "key-2");
    expect(apiMutation).toHaveBeenCalledWith("/notifications/preferences", { method: "PUT", body: { announcementEnabled: false, pointsEnabled: true }, token: "session", idempotencyKey: "key-2" });
  });
});
