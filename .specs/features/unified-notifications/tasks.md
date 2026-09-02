# Unified Notifications Tasks

| Task | Requirement | Verification | Status |
|---|---|---|---|
| V2 subscriptions and VAPID config | NOTIF-02, NOTIF-06 | Go tests, API build/vet | Done |
| Transactional notification outbox and push worker | NOTIF-01, NOTIF-06 | Go tests and worker build | Done |
| Queue Firestore-to-V2 bridge | NOTIF-01, NOTIF-04 | Functions unit tests | Done |
| Frontend opt-in, subscription management and service-worker click routing | NOTIF-01, NOTIF-02, NOTIF-04 | 34 focused unit tests and typecheck | Done |
| Moderation exception policy and history icons | NOTIF-03, NOTIF-05 | Existing API/frontend tests | Done |
| Operational provisioning and live homologation | NOTIF-01, NOTIF-06 | Requires deployment secrets, HTTPS and worker schedule | Pending |

## Coverage matrix

| Requirement | Automated evidence |
|---|---|
| Important categories and fallback | API service/repository tests; queue bridge tests |
| Explicit opt-in states | `src/lib/pwa/push-notifications.test.ts` |
| Moderation exception-only | API moderation repository/service tests |
| Polling/realtime preservation | Existing `dnj-app`, game and queue tests |
| History icons | `dnj-controls.test.tsx` |
| Idempotency and invalid endpoints | API service/repository tests; worker implementation |
