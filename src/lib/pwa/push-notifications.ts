import { notificationsApi, type PushSubscriptionInput } from "@/lib/api/notifications";

export type PushSetupState = "unsupported" | "not-asked" | "denied" | "ready" | "subscribed" | "error";

function supportsPush(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
}

export function pushSetupState(): PushSetupState {
  if (!supportsPush()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  return Notification.permission === "granted" ? "ready" : "not-asked";
}

export async function currentPushSetupState(): Promise<PushSetupState> {
  const state = pushSetupState();
  if (state !== "ready") return state;
  try {
    return await (await navigator.serviceWorker.ready).pushManager.getSubscription() ? "subscribed" : "ready";
  } catch {
    return "ready";
  }
}

export function vapidKeyBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}

function subscriptionInput(subscription: PushSubscription): PushSubscriptionInput {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) throw new Error("Inscrição de notificações inválida.");
  return { endpoint: json.endpoint, keys: { p256dh, auth } };
}

export async function enablePushNotifications(): Promise<PushSetupState> {
  const initial = pushSetupState();
  if (initial === "unsupported" || initial === "denied") return initial;
  if (Notification.permission !== "granted" && await Notification.requestPermission() !== "granted") return "denied";
  try {
    const [registration, config] = await Promise.all([navigator.serviceWorker.ready, notificationsApi.pushConfig()]);
    const existing = await registration.pushManager.getSubscription();
    const applicationServerKey = vapidKeyBytes(config.publicKey);
    const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey.buffer as ArrayBuffer });
    await notificationsApi.subscribePush(subscriptionInput(subscription));
    return "subscribed";
  } catch {
    return "error";
  }
}

export async function disablePushNotifications(): Promise<PushSetupState> {
  if (!supportsPush()) return "unsupported";
  try {
    const subscription = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (!subscription) return pushSetupState();
    await notificationsApi.unsubscribePush(subscription.endpoint);
    await subscription.unsubscribe();
    return "ready";
  } catch {
    return "error";
  }
}
