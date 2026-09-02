import test from "node:test";
import assert from "node:assert/strict";

const bridge = await import("../lib/queue-notification-bridge.js");

test("accepts only a called queue document with complete V2 identity", () => {
  assert.equal(bridge.queueCalledPayload("entry-1", {status: "queued", queueType: "confissoes", phone: "user-1", calledAt: new Date()}), null);
  assert.equal(bridge.queueCalledPayload("entry-1", {status: "called", queueType: "confissoes", calledAt: new Date()}), null);
  assert.deepEqual(bridge.queueCalledPayload("entry-1", {
    status: "called", queueType: "confissoes", phone: "user-1", calledAt: new Date("2026-08-30T12:00:00.000Z"),
  }), {queueId: "confissoes", entryId: "entry-1", participantUserId: "user-1", calledAt: "2026-08-30T12:00:00.000Z"});
});

test("forwards exactly the V2 contract with a stable idempotency key", async () => {
  let request;
  await bridge.dispatchQueueCalledNotification("https://v2.example/v2/", "secret", {
    queueId: "confissoes", entryId: "entry-1", participantUserId: "user-1", calledAt: "2026-08-30T12:00:00.000Z",
  }, async (url, init) => { request = {url, init}; return {ok: true, status: 201}; });

  assert.equal(request.url, "https://v2.example/v2/internal/notifications/queue-called");
  assert.equal(request.init.headers.Authorization, "Bearer secret");
  assert.equal(request.init.headers["Idempotency-Key"], "queue-called:confissoes:entry-1");
  assert.deepEqual(JSON.parse(request.init.body), {queueId: "confissoes", entryId: "entry-1", participantUserId: "user-1", calledAt: "2026-08-30T12:00:00.000Z"});
});

test("fails so the platform retries a temporary V2 bridge error", async () => {
  await assert.rejects(() => bridge.dispatchQueueCalledNotification("https://v2.example/v2", "secret", {
    queueId: "confissoes", entryId: "entry-1", participantUserId: "user-1", calledAt: "2026-08-30T12:00:00.000Z",
  }, async () => ({ok: false, status: 503})), /503/);
});
