import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {initializeTestEnvironment, assertSucceeds, assertFails} from "@firebase/rules-unit-testing";
import {doc, setDoc, getDoc} from "firebase/firestore";

test("emulator allows pastoral documents and denies unrelated documents", async () => {
  const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
  const env = await initializeTestEnvironment({
    projectId: "demo-pastoral-queue",
    firestore: {rules},
  });

  try {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(setDoc(doc(db, "pastoral_queue/current/config/default"), {isQueueOpen: true}));
    await assertSucceeds(getDoc(doc(db, "pastoral_queue/current/config/default")));
    await assertFails(setDoc(doc(db, "unrelated/data"), {value: true}));
  } finally {
    await env.cleanup();
  }
});
