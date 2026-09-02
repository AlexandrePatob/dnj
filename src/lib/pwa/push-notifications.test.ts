// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notificationsApi } from "@/lib/api/notifications";
import { currentPushSetupState, enablePushNotifications, pushSetupState, vapidKeyBytes } from "./push-notifications";

vi.mock("@/lib/api/notifications", () => ({ notificationsApi: { pushConfig: vi.fn(), subscribePush: vi.fn(), unsubscribePush: vi.fn() } }));

describe("push notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(globalThis, "PushManager", { configurable: true, value: class {} });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: {} }) } });
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: { permission: "default", requestPermission: vi.fn().mockResolvedValue("granted") } });
  });

  it("decodes a URL-safe VAPID public key", () => {
    expect([...vapidKeyBytes("AQI-")]).toEqual([1, 2, 62]);
  });

  it("does not request permission when the browser has blocked it", async () => {
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: { permission: "denied", requestPermission: vi.fn() } });
    expect(pushSetupState()).toBe("denied");
    await expect(enablePushNotifications()).resolves.toBe("denied");
  });

  it("subscribes an approved device through the V2 API", async () => {
    const subscription = { endpoint: "https://push.example/device", toJSON: () => ({ endpoint: "https://push.example/device", keys: { p256dh: "key", auth: "auth" } }) };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: vi.fn().mockResolvedValue(null), subscribe: vi.fn().mockResolvedValue(subscription) } }) } });
    vi.mocked(notificationsApi.pushConfig).mockResolvedValue({ publicKey: "AQI-" });
    vi.mocked(notificationsApi.subscribePush).mockResolvedValue({ id: "sub-1", state: "active" });
    await expect(enablePushNotifications()).resolves.toBe("subscribed");
    expect(notificationsApi.subscribePush).toHaveBeenCalledWith({ endpoint: "https://push.example/device", keys: { p256dh: "key", auth: "auth" } });
  });

  it("reports an existing device subscription as active", async () => {
    Object.defineProperty(globalThis, "Notification", { configurable: true, value: { permission: "granted", requestPermission: vi.fn() } });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { ready: Promise.resolve({ pushManager: { getSubscription: vi.fn().mockResolvedValue({ endpoint: "https://push.example/device" }) } }) } });
    await expect(currentPushSetupState()).resolves.toBe("subscribed");
  });
});
