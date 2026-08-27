# Filas Pastorais Validation

**Date**: 2026-08-26 (re-validation pass 3)  
**Spec**: `.specs/features/pastoral-queues/spec.md`  
**Diff range**: `f53789a..ef281d2`  
**Verifier**: independent sub-agent (author ≠ verifier)

## Task Completion

| Task | Status | Evidence / notes |
| --- | --- | --- |
| T1 | ✅ Done | `src/lib/pastoral-queue/firebase.ts` and package dependency present; typecheck/build pass. |
| T2 | ✅ Done | Domain types, paths, statuses, milestones and config validator present; unit tests pass. |
| T3 | ⚠️ Partial | Participant transaction tests pass, but the UI has no identity recovery listener. |
| T4 | ⚠️ Partial | Console now routes through atomic manager transitions; no concurrent-call test exists. |
| T5 | ❌ Not done | Listener and intent helper exist, but no realtime-service tests and no listener integration creates intents. |
| T6 | ⚠️ Partial | Participant screen uses Firestore and its stale unit test was corrected; cross-device recovery remains absent. |
| T7 | ✅ Done | Scope union/composition and tests for `pastoral_queue` are present. |
| T8 | ⚠️ Partial | Read/update/validation service exists; no test preserves a valid document after an invalid write, and push fields have no manager controls. |
| T9 | ⚠️ Partial | Console now uses atomic transitions and highlights the 2-minute threshold; no push/delay controls or behavior-level timeout test exists. |
| T10 | ✅ Done | Admin navigation/overview and read-only assertions are present. |
| T11 | ✅ Done (emulator optional) | Firebase boundary/rules/indexes/package exist and function TypeScript build passes; emulator-only local check is unavailable because Java is missing. This does not block runtime or Admin listing. |
| T12 | ❌ Not done | No notification Function source or trigger exists. |
| T13 | ❌ Not done | No `push-client.ts`, targeted endpoint contract, or individual delivery implementation exists. |
| T14 | ❌ Not done | `tests/e2e/pastoral-queue.spec.ts` is absent. |
| T15 | ✅ Done | Runbook and deployment checklist exist, including the direct-Firestore trade-off. |

## Spec-Anchored Acceptance Criteria

Evidence is required as `file:line` plus an assertion. Where there is no behavior-level evidence, the result is GAP rather than an inferred pass.

| Criterion | Spec-defined outcome | Evidence | Result |
| --- | --- | --- | --- |
| PQUEUE-01: eligible participant creates FIFO entry and sees realtime position | Persist a queued entry and show its persisted order | `src/lib/pastoral-queue/participant-service.test.ts:58-65` asserts idempotent existing entry; `src/lib/pastoral-queue/manager-service.test.ts:16-20` asserts queued-to-called only. No participant position/realtime assertion. | ❌ GAP |
| PQUEUE-02: active participant cannot join another queue | Reject with the active-queue conflict | `src/lib/pastoral-queue/participant-service.test.ts:29-37` — `expect(...).rejects.toMatchObject({ code: "already_active" })`. | ✅ PASS (service only) |
| PQUEUE-03: voluntary exit releases entry without consuming limit | Mark active queued entry cancelled and clear active state while preserving completed types | `src/lib/pastoral-queue/participant-service.test.ts:48-55` — asserts `status: "cancelled"` and preserved `completedTypes`. | ✅ PASS (service only) |
| PQUEUE-04: completed type is blocked | Reject with `already_completed` | `src/lib/pastoral-queue/participant-service.test.ts:34-37` — exact error code assertion. | ✅ PASS (service only) |
| PQUEUE-05: scoped manager atomically calls FIFO next | Only earliest queued entry becomes `called` | `src/lib/pastoral-queue/manager-service.test.ts:16-20` asserts `e1` and `status: "called"`; console evidence at `src/components/manager/pastoral-queue-console.tsx:30-34` instead performs a non-atomic read/sort/write. | ❌ GAP |
| PQUEUE-06: called for two minutes is highlighted without automatic removal | Persistent manager alert after 120 seconds, entry remains | `src/components/manager/pastoral-queue-console.tsx:45` only renders static “Aguardando confirmação (2 min)”; no timer/elapsed assertion and no 120-second logic. | ❌ GAP |
| PQUEUE-07: completion consumes only matching type | Entry completed and matching participant type recorded | `src/lib/pastoral-queue/manager-service.test.ts:27-32` asserts completed status and both existing spiritual plus new confession completion. | ✅ PASS (service only) |
| PQUEUE-08: no-show releases without consuming limit | Entry ends `no_show`, completed types unchanged, retry allowed | `src/lib/pastoral-queue/manager-service.test.ts:33-35` asserts empty completed types. Retry behavior is not asserted. | ⚠️ Partial |
| PQUEUE-09: concurrent calls cannot duplicate person | Distinct calls or one rejected | No concurrent test or transaction conflict assertion exists; console path is explicitly read-then-write at `src/components/manager/pastoral-queue-console.tsx:30-34`. | ❌ GAP |
| PQUEUE-10: first transition to 10/5 creates one directed intent | One deterministic intent per entry/milestone | `src/lib/pastoral-queue/types.test.ts:42-46` only checks ID string stability; no position transition or intent creation assertion. | ❌ GAP |
| PQUEUE-11: called creates directed “sua vez” intent | One called intent targeted to participant | No notification Function, trigger, or assertion exists. `src/lib/pastoral-queue/realtime-service.ts:57-64` exposes an untested helper only. | ❌ GAP |
| PQUEUE-12: open app shows contextual modal in addition to push | Modal appears once for milestone/call update | `src/features/queue/queue-screen.tsx:13,17` contains local notice rendering, but `src/features/queue/queue-screen.test.tsx:7-17` fails before tracking and asserts the removed demonstration text. | ❌ GAP |
| PQUEUE-13: push failure/denial does not corrupt queue | Queue operation remains successful when push fails | No push implementation or failure test exists. | ❌ GAP |
| PQUEUE-14: Admin sees both queues live and read-only | Totals, next entries and current call, with no operation controls | `src/components/admin/admin-dashboard.test.tsx:59-68` asserts both headings, counts, called person and no call/resolve buttons. | ✅ PASS (component fixture) |
| PQUEUE-15: non-admin protection remains | Existing admin protection and scoped manager surface remain | `src/components/manager/manager-dashboard.test.tsx:37-52` asserts pastoral scope recognition; Admin existing tests pass, but no negative Firestore role enforcement is possible with `allow read, write: if true` at `firestore.rules:8-10`. | ⚠️ Partial / security risk accepted in design |
| PQUEUE-16: `isQueueOpen` opens/closes both without removing active entries | Global config controls admission for both types; active entries remain | `src/lib/pastoral-queue/participant-service.test.ts:40-45` asserts closed admission and zero writes; `src/components/manager/pastoral-queue-console.tsx:40,44` shows global toggle. No active-entry preservation test. | ⚠️ Partial |
| PQUEUE-17: closed queues show status and reject entry | Closed status visible and join rejected | `src/lib/pastoral-queue/participant-service.test.ts:40-45` asserts `queue_closed`; UI has generic error at `src/features/queue/queue-screen.tsx:15`, but no closed-status UI assertion. | ⚠️ Partial |
| PQUEUE-18: push toggle/delay respected while milestones immutable | New intents honor global push/delay; 10/5/called remain fixed | `src/lib/pastoral-queue/config-service.test.ts:15-20` rejects delay 301; `src/lib/pastoral-queue/types.test.ts:20-29` validates bounded config and fixed milestone list. No delivery behavior or UI toggle assertion. | ⚠️ Partial |
| PQUEUE-19: invalid config preserves last valid value | Reject invalid value and preserve existing document | `src/lib/pastoral-queue/config-service.test.ts:15-19` asserts rejection and no `setDoc`; no prior-document preservation/emulator assertion. | ⚠️ Partial |

**Status**: ❌ Gaps present (8 criteria pass/partial at service/component level; critical P1 notification, timeout, concurrency and E2E criteria are uncovered).

## Discrimination Sensor

| Mutation | Description | Result |
| --- | --- | --- |
| 1 | Flip a queue transition/position behavior in scratch state | ⏭️ Not run: mandatory build gate failed on lint before sensor stage. |
| 2 | Remove notification-intent side effect in scratch state | ⏭️ Not run: no notification implementation/tests exist. |

**Sensor depth**: blocked by failed gate and missing notification implementation.  
**Result**: ⚠️ BLOCKED, no mutation result can be claimed.

## Code Quality

| Principle | Status |
| --- | --- |
| No features beyond request | ✅ |
| Surgical changes | ⚠️ 35 files changed; implementation remains incomplete across planned tasks. |
| Matches existing patterns/style | ⚠️ Lint errors are fixed, but the manager transaction typing still breaks standalone typecheck. |
| Spec-anchored outcomes | ❌ Multiple tests cover only helper existence/basic writes, not exact user-visible outcomes. |
| Per-layer coverage expectation | ❌ No notification tests, no realtime-service tests, no pastoral E2E, and no valid emulator run. |
| Every test maps to a requirement | ⚠️ Unit suite passes, but critical notification/timeout/concurrency behavior has no tests. |
| Documented guidelines | ✅ TLC skill and feature docs are present. |

## Edge Cases

- ✅ Empty queue error is asserted in `src/lib/pastoral-queue/manager-service.test.ts:22-25`.
- ✅ Terminal resolve conflict is asserted in `src/lib/pastoral-queue/manager-service.test.ts:22-25`.
- ✅ Same join retry is asserted in `src/lib/pastoral-queue/participant-service.test.ts:58-65`.
- ⚠️ Firestore unavailable has a recoverable UI message, but no test asserts the no-demonstrative-position requirement.
- ❌ Cross-device recovery is not implemented: screen only subscribes after local `type` is selected (`src/features/queue/queue-screen.tsx:13`).
- ❌ Notification deduplication across reconnects has no integration or service test.

## Gate Check

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck` | ✅ pass after `a500286` restored the transaction query compatibility. |
| Lint | `npm run lint` | ✅ pass with 0 errors, 157 pre-existing/style warnings |
| Unit | `npm run test:unit` | ✅ 53 files passed; 229 tests passed, 0 failed |
| Build | `npm run build` | ✅ pass; Next production build completed. |
| Complete | `npm run validate` | ⚠️ not rerun in this pass; the previously failing typecheck now passes, while functional gaps remain. |
| Functions build | `npm --prefix functions run build` | ✅ pass |
| Functions unit | `npm --prefix functions test` | ✅ 1 passed, 0 failed |
| Firestore emulator (optional local QA) | `npm --prefix functions run test:emulator` | ⚠️ unavailable: `Could not spawn java -version`; Java is not installed/on PATH. This is not a production/Admin listing blocker. |

**Test count before feature**: not independently reproducible from the current checkout without changing the real tree; no deletion was observed in the feature diff.  
**Test count after feature**: 229 unit tests (229 passed) plus 1 Functions unit test passed.  
**Skipped**: no pastoral E2E file exists; emulator blocked by Java.

## Ranked Gaps / Fix Plans

1. **Blocker — complete notification path**: implement and test T12/T13 with a verified official targeted-push endpoint; currently there is no `functions/src/pastoral-queue/notifications.ts` or `push-client.ts`.
2. **Major — use atomic manager service and implement 120-second alert**: route console actions through `callNext`/`resolveCalled`, add elapsed-time/persistent alert and concurrency tests.
3. **Major — complete participant realtime lifecycle**: recover active participant state on mount, calculate persisted position, create deduplicated 10/5/called intents and update the stale queue-screen test.
4. **Major — add T14 E2E and run emulator**: add the specified journey; install/configure Java or provide an equivalent emulator environment before claiming rules coverage.
5. **Major — fix standalone typecheck**: type the Firestore transaction/query overload correctly in `manager-service.ts`; Next build currently succeeds but `npm run typecheck` fails.

## Summary

**Overall**: ❌ Not ready  
**Spec-anchored check**: 6/19 have direct passing evidence, 8 partial, 5 uncovered; no precise evidence for the core notification/timeout/concurrency flows.  
**Sensor**: blocked; 0/0 completed because the mandatory gate still fails at typecheck.  
**Gate**: typecheck/lint/unit/build/functions build+unit pass; complete gate not rerun; emulator blocked.

**What works**: Firestore client/domain foundation, participant basic transaction guards, basic manager service transitions, manager scope composition, Admin read-only fixture, config bounds, isolated rules/package scaffolding, and runbook.  
**Issues found**: atomic manager routing and threshold highlighting are now present, but notifications (T12/T13), pastoral E2E (T14), cross-device recovery and behavior-level concurrency/timeout coverage remain absent.  
**Next step**: route the remaining T12/T13/T14/cross-device and coverage gaps to implementers, then rerun this independent verifier.
