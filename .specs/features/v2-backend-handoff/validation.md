# v2-backend-handoff — Independent Validation

**Date**: 2026-08-25  
**Spec**: `.specs/features/v2-backend-handoff/spec.md`  
**Diff range**: `277c9d8..HEAD` (`9de630f` HEAD)  
**Verifier**: independent fresh-eyes pass; no implementation files changed and no commit created.

## Verdict

**PARTIAL — WebKit overlay gap stabilized in the test, but final full-suite verification was interrupted.** The missing local dependency was restored from the existing npm lockfile. Chromium targeted passed 2/2; the isolated WebKit scanner journey passed 1/1. The combined Chromium/WebKit run reached Chromium 2/2, while WebKit did not produce a final completed result before the run was stopped.

## Gates

| Gate | Result | Evidence |
|---|---|---|
| `npm run typecheck` | PASS | exit 0 |
| `npm run lint` | PASS | exit 0; 0 errors, 158 warnings |
| `npm run test:unit` | PASS | 81 files; 275 tests passed |
| `npm run build` | PASS | exit 0; Next 16.2.10; 63/63 pages |
| Targeted V2 E2E | PARTIAL | Chromium 2/2 passed; isolated WebKit scanner journey 1/1 passed. Combined WebKit run was stopped before completion after the overlay fix. |
| Dependency | PASS | `npm ci`; `npm ls esbuild --depth=0` => `esbuild@0.27.2`; package/lock unchanged |
| Full E2E | NOT RUN | The original missing-esbuild blocker is resolved, but the requested full suite was not run to completion in this turn. |

Targeted V2 emitted proxy `ECONNREFUSED` logs for `http://localhost:8080/v2/...`, but all four assertions passed.

## Spec-anchored acceptance criteria (evidence-or-zero)

| AC | Result | Evidence |
|---|---|---|
| Auth P1-1: valid session loads identity/onboarding without V1/Supabase | PASS with boundary caveat | `tests/e2e/v2-migration.spec.ts:15-33` asserts bootstrap/no V1; `src/components/dnj-app.tsx:65-145`. |
| Auth P1-2: exactly one refresh and replay after 401 | PASS | `src/lib/api/client.test.ts`: concurrent 401s assert 5 fetches and exactly one `/auth/refresh`. |
| Auth P1-3: incomplete onboarding precedes protected resources | PASS | `src/components/dnj-app.tsx:65-145` and `src/components/dnj-app.test.tsx`. |
| Auth P1-4: preserve code/message/requestId | PASS | `src/lib/api/client.test.ts`: exact `code`, `message`, `details`, `requestId`, and `status`. |
| Core P1-1: three parallel reads; 204 empty | PARTIAL | `src/features/game/game-screen.tsx:315-328`; E2E empty state passes, but no exact parallel-start assertion. |
| Core P1-2: QR body only token, fresh UUID v4 key | PASS | `src/lib/api/game.test.ts`: UUID v4 regex and body/key adapter payload. |
| Media P1-1: checksum → intent → PUT → complete → Moment | PASS | `src/lib/api/media.test.ts`: exact sequence and checksum/intent/complete/publish payloads. |
| Media P1-2: 409 UPLOAD_INCOMPLETE retries same intent | PASS | `src/lib/api/media.test.ts`: two complete calls share a key; intent count is exactly one. |
| Core P1-3: valid scope and opaque cursor | PASS | `src/lib/api/moments.test.ts` and `src/features/gallery/gallery-screen.test.tsx`: supported scope, encoded opaque cursor, and feed scope. |
| Core P1-4: every V2 write has stable idempotency | PARTIAL | QR/like adapter assertions exist; upload/composer and all writes are not jointly proven. |
| Safe P1-1: every migrated flow has happy/empty/error/retry integration/E2E | FAIL | `tests/e2e/v2-migration.spec.ts:15-43` has two journeys; no complete Moment/gallery retry journey. |
| Safe P1-2: rollback retained until traffic evidence | PASS | `docs/api/dnj-v2-migration-inventory.md:3-10,24`. |
| Safe P1-3: unconfirmed equivalents remain isolated | PASS | `docs/api/dnj-v2-migration-inventory.md:11-14,24`. |
| Safe P1-4: service worker never caches V2/auth/signed URLs | PASS | `src/pwa/cache-policy.test.ts:61-75`; `src/pwa/sw.test.ts:164-183`. |
| P2-1: adopted profile/favorites/members/notifications use V2 | PARTIAL | Adapter tests exist; no adopted UI-surface evidence. |
| P2-2: mutations canonical and idempotent | PARTIAL | Adapter tests exist; no complete UI/E2E evidence; paths provisional at inventory line 20. |

## Edge cases

- `409 IDEMPOTENCY_KEY_REUSED`: **ZERO**, no exact assertion.
- Expired signed upload URL requests a new intent: **ZERO**, no exact assertion.
- Expired signed media URL re-fetch/no persistence: **PARTIAL**, network-only PWA evidence at `src/pwa/cache-policy.test.ts:69-75`.
- Network/timeout/5xx retry and no automatic 409 retry: **PARTIAL**, client distinctions at `src/lib/api/client.test.ts:24-70`, no full mutation matrix.
- UTC transport/local presentation: **ZERO**, no exact assertion.

## Discrimination sensor (scratch worktree)

Ran in disposable `scratch-v2-verify-20260825`, removed afterward.

| Mutation | Result |
|---|---|
| Remove `idempotencyKey` from `gameApi.validateQr` | **Killed** — `src/lib/api/game.test.ts`: 1 failed, 1 passed |
| Remove `/api/v2` network-only branches from cache policy | **Killed** — cache test failed; combined PWA result 1 failed, 31 passed |

**Sensor**: 2/2 killed; PASS for sampled adapter/cache behaviors, but it cannot close the zero-evidence ACs.

## Quality and traceability

- No implementation file changed; no commit created.
- Current lint has 0 errors; 158 warnings remain.
- `tasks.md:8` still says Draft/awaiting approval.
- Traceability contradiction: `spec.md:120-134` says 0 mapped/9 unmapped while `tasks.md:494-505` contains a mapping.

## Prioritized residual gaps

1. **Remaining** — Complete a fresh full `npm run test:e2e` run and record its exit status; no dependency or lockfile change is required.

## Summary

**Overall**: ⚠️ Test stabilization committed; full browser readiness pending a completed suite run.  
**Gate**: prior typecheck/lint/unit/build PASS; targeted V2 E2E Chromium 2/2 and isolated WebKit scanner 1/1 pass; combined WebKit/full E2E not completed after this test-only change.  
**Sensor**: 2/2 mutations killed.  
**Diff**: `277c9d8..HEAD`.  
**Changes**: media/client/gallery/QR tests and media idempotency fix; dependency installation restored `node_modules` only.
