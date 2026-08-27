import {initializeApp} from "firebase-admin/app";
import {FieldValue, Timestamp, getFirestore} from "firebase-admin/firestore";
import {logger} from "firebase-functions";
import {onSchedule} from "firebase-functions/scheduler";
import {setGlobalOptions} from "firebase-functions/v2";

setGlobalOptions({region: "southamerica-east1"});
initializeApp();

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
