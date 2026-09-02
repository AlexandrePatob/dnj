# Verification Record

Verification was performed against the consolidated specification after the frontend, Functions and V2 changes were merged in the shared worktree. No source commits were created.

## Evidence

- Frontend `npm run typecheck`: passed.
- Frontend focused unit suite: 4 files / 34 tests passed.
- Frontend production `npm run build`: passed, including service-worker generation.
- Firebase Functions `npm --prefix functions test`: 4 tests passed.
- V2 API affected packages: `go test` passed; `go vet ./...`, Wire generation and `go build ./...` passed (reported by API implementation agent).
- `git diff --check`: no whitespace errors in either repository.

## Contract review

- Frontend calls `/api/v2/push/config`, `/api/v2/push/subscriptions` (PUT/DELETE); V2 exposes the matching protected routes.
- Firestore bridge forwards only a transition to `called`, with the exact V2 authorization and idempotency contract.
- V2 persists notification + delivery outbox transactionally; the worker owns VAPID dispatch and deactivates 404/410 endpoints.
- Polling and Firestore realtime remain state synchronization paths; push policy is not decided in the frontend.
- Moderation records are limited to rejection/deletion/point reversal; normal activity and approval are not interruptive notifications.

## Release blockers

- Provision VAPID public/private key and subject in the API worker environment.
- Provision the queue bridge URL/token in Firebase and V2.
- Schedule `cmd/push-worker` and execute an HTTPS browser-background test with a real subscription.
- Special Event and Moment Challenge currently retain their existing polling/live surfaces; their V2 persisted notification producers still need to be connected before claiming end-to-end push for those two categories.

## Decision

Implementation is ready for deployment configuration and homologation, but not yet for a “live push verified” claim. This record intentionally preserves all work uncommitted as requested.
