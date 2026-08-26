import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationsApi } from "./notifications";
import { apiMutation, apiRequest } from "./client";

vi.mock("./client", () => ({ apiRequest: vi.fn(), apiMutation: vi.fn(), newIdempotencyKey: vi.fn(() => "notification-key") }));

describe("notificationsApi", () => {
  beforeEach(() => vi.clearAllMocks());

  it("lists notifications and forwards the opaque cursor", () => {
    notificationsApi.list("a/b?c", "session");
    expect(apiRequest).toHaveBeenCalledWith("/notifications?cursor=a%2Fb%3Fc", { token: "session" });
  });

  it("marks one notification read with an idempotency key", () => {
    notificationsApi.markRead("notice/1", "session", "key-1");
    expect(apiMutation).toHaveBeenCalledWith("/notifications/notice%2F1/read", { method: "PATCH", token: "session", idempotencyKey: "key-1" });
  });

  it("updates notification preferences idempotently", () => {
    notificationsApi.updatePreferences({ email: false, push: true }, "session", "key-2");
    expect(apiMutation).toHaveBeenCalledWith("/notifications/preferences", { method: "PATCH", body: { email: false, push: true }, token: "session", idempotencyKey: "key-2" });
  });
});
