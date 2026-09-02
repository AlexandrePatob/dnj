import {initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {defineSecret} from "firebase-functions/params";
import {onDocumentWritten} from "firebase-functions/v2/firestore";
import {onSchedule} from "firebase-functions/scheduler";
import {setGlobalOptions} from "firebase-functions/v2";
import {dispatchQueueCalledNotification, queueCalledPayload} from "./queue-notification-bridge.js";

setGlobalOptions({region: "southamerica-east1"});
initializeApp();

const queueNotificationBridgeUrl = defineSecret("QUEUE_NOTIFICATION_BRIDGE_URL");
const queueNotificationBridgeToken = defineSecret("DNJ_QUEUE_BRIDGE_TOKEN");

/** Forwards a queue-call transition to V2; V2 owns notification policy and push delivery. */
export const notifyQueueCalled = onDocumentWritten({
  document: "calledPeople/{entryId}",
  secrets: [queueNotificationBridgeUrl, queueNotificationBridgeToken],
  retry: true,
}, async (event) => {
  const before = event.data?.before;
  const after = event.data?.after;
  if (!after?.exists || before?.data()?.status === "called") return;

  const document = after.data();
  if (!document) return;
  const payload = queueCalledPayload(event.params.entryId, document);
  if (!payload) return;

  const baseUrl = queueNotificationBridgeUrl.value();
  const token = queueNotificationBridgeToken.value();
  if (!baseUrl || !token) {
    logger.warn("Queue notification bridge is not configured", {entryId: event.params.entryId});
    return;
  }

  await dispatchQueueCalledNotification(baseUrl, token, payload);
  logger.info("Queue call forwarded to V2", {entryId: payload.entryId, queueId: payload.queueId});
});

/** Marks calls unanswered after the two-minute grace period as no-shows. */
export const expirePastoralCalls = onSchedule("every 1 minutes", async () => {
  const expired = await getFirestore()
    .collection("calledPeople")
    .where("status", "==", "called")
    .where("expiresAt", "<=", Timestamp.now())
    .get();

  if (expired.empty) return;
  const batch = getFirestore().batch();
  expired.docs.forEach((entry) => batch.update(entry.ref, {
    status: "no-show",
    updatedAt: FieldValue.serverTimestamp(),
    resolvedBy: {id: "system", name: "Ausência automática"},
  }));
  await batch.commit();
  logger.info("Pastoral calls marked as no-show", {count: expired.size});
});
