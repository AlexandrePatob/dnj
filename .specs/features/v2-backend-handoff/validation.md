# v2-backend-handoff — Independent Focused Validation

**Date**: 2026-08-25  
**Spec**: `.specs/features/v2-backend-handoff/spec.md`  
**Diff range**: `6cc34b9^..6cc34b9`  
**Verifier**: independent fresh-eyes pass; no implementation code changed.

## Verdict

**FOCUSED PASS with external blocker noted.** Typecheck, lint, unit, build and Chromium targeted E2E passed. WebKit passed bootstrap but failed gallery because `localhost:8080` V2 upstream was unavailable. Full E2E was not repeated.

## Exact results

| Gate | Result |
|---|---|
| `npm run typecheck` | PASS, exit 0 |
| `npm run lint` | PASS, exit 0; 158 warnings, 0 errors |
| `npm run test:unit` | PASS; 81 files, 275 tests |
| `npm run build` | PASS, exit 0; 63/63 pages |
| Chromium targeted V2 E2E | PASS; 2/2 |
| WebKit targeted V2 E2E | PARTIAL; 1/2 passed, 1/2 failed |
| Full E2E | NOT RUN in final pass, per request |

WebKit failure: `tests/e2e/v2-migration.spec.ts:48` timed out waiting for `Ainda não há momentos`; logs showed repeated `ECONNREFUSED` for `http://localhost:8080/v2/{participations/current,game/overview,activity-runs/current,moments?scope=feed}`. External environment/upstream blocker.

## Spec-anchored AC evidence

| AC | Evidence | Result |
|---|---|---|
| Valid session avoids V1/Supabase | `tests/e2e/v2-migration.spec.ts:19-28`; `src/components/dnj-app.tsx:65-145` | PASS |
| Exactly one refresh and replay | `src/lib/api/client.test.ts:103-117` | PASS |
| Onboarding gate | `src/components/dnj-app.test.tsx`; `src/components/dnj-app.tsx:65-145` | PASS |
| Error envelope preserved | `src/lib/api/client.test.ts` exact code/message/details/requestId/status assertions | PASS |
| Game parallel reads/204 empty | `src/features/game/game-screen.tsx:315-328`; targeted E2E | PASS; no exact start-order assertion |
| QR token-only + UUID v4 key | `src/lib/api/game.test.ts:5` | PASS |
| Upload checksum → intent → PUT → complete → Moment | `src/lib/api/media.test.ts:5-12` | PASS |
| 409 upload retry same intent/key | `src/lib/api/media.test.ts:14-20` | PASS |
| Gallery scope + opaque cursor | `src/lib/api/moments.test.ts:5`; gallery tests | PASS |
| V2 write idempotency | QR/like/profile/notification/upload tests | PASS for covered adapters; no exhaustive matrix |
| Migrated-flow happy/empty/error/retry integration | `tests/e2e/v2-migration.spec.ts:19-49` + unit suites | PARTIAL; no complete Moment/gallery retry E2E |
| Rollback retained | `docs/api/dnj-v2-migration-inventory.md:3-10,24` | PASS |
| Unconfirmed equivalents isolated | `docs/api/dnj-v2-migration-inventory.md:11-14,24` | PASS |
| SW avoids V2/auth/signed-URL caching | `src/pwa/cache-policy.test.ts:61-75`; `src/pwa/sw.test.ts:164-183` | PASS |
| P2 adopted surfaces/canonical mutations | profile/favorites/notifications adapter tests | PARTIAL; no adopted UI E2E |

## Discrimination sensor

Scratch-state behavior mutations: remove QR idempotency key — **KILLED**; remove V2 network-only cache branch — **KILLED**; remove single-flight refresh/replay — **KILLED**; make upload retry create a new intent/key — **KILLED**; rebuild cursor/scope — **KILLED**. **5/5 killed**, no surviving mutant, no code changed.

## Summary

**Overall**: ✅ focused verification PASS; ⚠️ full browser readiness externally blocked.  
**Sensor**: 5/5 killed.  
**Blocker**: V2 upstream `localhost:8080` refused connections in WebKit gallery journey.  
**Full suite**: not repeated, as instructed.
