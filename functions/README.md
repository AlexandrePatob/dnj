# Pastoral queue Firebase boundary

This is an isolated Firebase Functions package for the pastoral queues. It
does not contain credentials or a service-account file. Select the target
Firebase project through the deploy environment before running Firebase CLI.

`expirePastoralCalls` runs every minute and marks calls unanswered after their
two-minute `expiresAt` deadline as `no-show`.

`notifyQueueCalled` preserves Firestore realtime and asynchronously forwards
only a transition to `called` to the V2 notification authority. It never sends
push itself. Configure its two Firebase Secret Manager values before deploy:

```sh
firebase functions:secrets:set QUEUE_NOTIFICATION_BRIDGE_URL
firebase functions:secrets:set DNJ_QUEUE_BRIDGE_TOKEN
```

The URL is the V2 base URL (for example `https://api.example/v2`). The Function
posts to `/internal/notifications/queue-called` with `Authorization: Bearer`,
the stable `Idempotency-Key` `queue-called:<queueId>:<entryId>`, and
`{queueId, entryId, participantUserId, calledAt}`. `queueId` is the existing
legacy Firestore `queueType` value and `participantUserId` is the existing
`phone` identity field. A non-2xx response fails the asynchronous Function so
the platform retries it; the queue document has already committed and its
realtime UI remains unaffected.

Use the local rules emulator with:

```sh
npm install
npm run test:emulator
```
