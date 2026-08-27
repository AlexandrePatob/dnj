# Filas Pastorais no Firestore — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill: activate it by name and follow its Execute flow and Critical Rules. The skill is the source of truth for the per-task cycle, gate, atomic commits and independent Verifier.

**Design**: `.specs/features/pastoral-queues/design.md`  
**Status**: Draft

---

## Test Coverage Matrix

> Generated from `README.md`, `package.json`, `vitest.config.ts`, `playwright.config.ts`, existing co-located tests, and the specification. The README defines `npm run validate` as the complete gate and requires deliberate review for visual snapshots.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| Queue domain/service | Unit | All state transitions, configuration bounds, duplicate/conflict paths, milestone deduplication and concurrent call behavior map 1:1 to PQUEUE-01–13 and PQUEUE-16–19 | `src/lib/pastoral-queue/*.test.ts` | `npm run test:unit -- src/lib/pastoral-queue` |
| Participant/Manager/Admin UI | Unit (React) | Happy path, empty/error state, role/scope restriction and each visible state from PQUEUE-01–15 | Co-located `*.test.tsx` | `npm run test:unit -- src/features/queue src/components/{admin,manager}` |
| Firebase notification Function | Unit | Payload, deterministic idempotency key, delivery success/failure and no duplicate delivery | `functions/src/pastoral-queue/*.test.ts` | `npm --prefix functions test` |
| Firestore rules/indexes/config | Emulator integration | Allowed participant/manager paths plus denied invalid writes; query/index requirements | `functions/test/pastoral-queue/*.test.ts` | `npm --prefix functions test:emulator` |
| Participant journey | E2E | Join, realtime position, leave, blocked completed type, and modal for a queued update | `tests/e2e/pastoral-queue.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

> Generated from the project scripts. The Function commands become available in T10 when its isolated Firebase package is created.

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Pure TypeScript or React task | `npm run typecheck && npm run test:unit -- [affected test path]` |
| Full | Firestore service, component integration or rules/function task | `npm run typecheck && npm run lint && npm run test:unit && npm run build` |
| Function | Firebase Function/rules task | `npm --prefix functions test` or `npm --prefix functions test:emulator` |
| E2E | Realtime participant flow | `npm run test:e2e` |
| Complete | Before feature completion | `npm run validate` |

---

## Execution Plan

### Phase 1: Firestore foundation

```
T1 → T2 → T3 → T4 → T5
```

### Phase 2: App surfaces, configuration and operational scope

```
T6 → T7 → T8 → T9 → T10
```

### Phase 3: Notification delivery and deployable Firebase boundary

```
T11 → T12 → T13
```

### Phase 4: End-to-end verification and operational documentation

```
T14 → T15
```

---

## Task Breakdown

### T1: Add the Firestore client boundary

**What**: Add the Firebase web dependency, public configuration template and a single Firestore initializer for the pastoral module.
**Where**: `package.json`, `.env.example`, `src/lib/pastoral-queue/firebase.ts`
**Depends on**: None
**Reuses**: Existing environment naming and `src/lib/api` import conventions.
**Requirement**: PQUEUE-01, PQUEUE-05, PQUEUE-10

**Done when**:

- [ ] The client initializes only in browser code and uses no service-account secret.
- [ ] Public Firebase variables are documented without values.
- [ ] Existing app typecheck/build still pass.

**Tests**: none — configuration/build layer.  
**Gate**: Full.  
**Commit**: `feat(pastoral-queue): add firestore client boundary`

### T2: Define the pastoral queue domain model

**What**: Add the types, collection paths, terminal states, milestones and deterministic intent-ID helpers.
**Where**: `src/lib/pastoral-queue/types.ts` and co-located test.
**Depends on**: T1
**Reuses**: Literal-union and API contract patterns in `src/lib/api`.
**Requirement**: PQUEUE-01 through PQUEUE-13

**Done when**:

- [ ] Both queue types, all five entry states and three milestones are represented.
- [ ] The global configuration has only `isQueueOpen`, `pushEnabled` and bounded `notificationDelaySeconds`; proximity milestones are not configurable.
- [ ] Terminal states cannot expose a next operational transition.
- [ ] Intent IDs are stable for the same entry/milestone and distinct otherwise.

**Tests**: Unit.  
**Gate**: Quick.  
**Commit**: `feat(pastoral-queue): define queue domain model`

### T3: Implement participant eligibility and entry commands

**What**: Implement Firestore transactions for eligibility, joining one queue and voluntary exit.
**Where**: `src/lib/pastoral-queue/participant-service.ts` and co-located test.
**Depends on**: T2
**Reuses**: Idempotent mutation behavior from `src/lib/api/client.ts`.
**Requirement**: PQUEUE-01, PQUEUE-02, PQUEUE-03, PQUEUE-04

**Done when**:

- [ ] A transaction blocks a second active queue and a completed type.
- [ ] A closed global queue blocks a new entry without affecting an active entry.
- [ ] Voluntary exit clears only the active entry and never a completed type.
- [ ] Retry of the same join/leave cannot duplicate or corrupt the participant index.

**Tests**: Unit.  
**Gate**: Full.  
**Commit**: `feat(pastoral-queue): add participant entry transactions`

### T4: Implement manager state transitions

**What**: Implement atomic FIFO call, 2-minute call metadata, completion and no-show commands.
**Where**: `src/lib/pastoral-queue/manager-service.ts` and co-located test.
**Depends on**: T2
**Reuses**: Transaction semantics from the legacy queue only; no legacy authorization or WhatsApp code.
**Requirement**: PQUEUE-05, PQUEUE-06, PQUEUE-07, PQUEUE-08, PQUEUE-09

**Done when**:

- [ ] Calling only selects the earliest queued entry and removes it from active position calculation.
- [ ] Two competing calls cannot place the same entry in `called` twice.
- [ ] Completion consumes only the matching service type; no-show releases the participant.
- [ ] Resolving an already-terminal entry returns a conflict.

**Tests**: Unit.  
**Gate**: Full.  
**Commit**: `feat(pastoral-queue): add manager queue transitions`

### T5: Implement realtime selectors and notification intents

**What**: Implement listener adapters for participant, manager and Admin views, plus atomic creation of unique intents for 10, 5 and called.
**Where**: `src/lib/pastoral-queue/realtime-service.ts` and co-located test.
**Depends on**: T3, T4
**Reuses**: Listener lifecycle from the legacy `useFirebaseQueue` without client-side delivery.
**Requirement**: PQUEUE-01, PQUEUE-05, PQUEUE-10, PQUEUE-11, PQUEUE-14

**Done when**:

- [ ] Participant selector exposes only its entry, position and eligibility state.
- [ ] Operations/Admin selectors expose correct current and queued summaries.
- [ ] Each milestone produces at most one deterministic pending intent, including across listener reconnects.

**Tests**: Unit.  
**Gate**: Full.  
**Commit**: `feat(pastoral-queue): add realtime selectors and notification intents`

### T6: Replace the participant queue simulation

**What**: Connect the existing Queue screen to the participant service and contextual modal, removing demonstration positions.
**Where**: `src/features/queue/queue-screen.tsx` and `queue-screen.test.tsx`.
**Depends on**: T3, T5
**Reuses**: Current selection cards, FAQ, animations and exit confirmation.
**Requirement**: PQUEUE-01, PQUEUE-02, PQUEUE-03, PQUEUE-04, PQUEUE-12, PQUEUE-13

**Done when**:

- [ ] The screen uses session identity, real listener state and recoverable errors.
- [ ] It never labels a local counter as a real position.
- [ ] A realtime milestone/called update displays a modal once for that state.

**Tests**: Unit (React).  
**Gate**: Full.  
**Commit**: `feat(pastoral-queue): connect participant queue screen`

### T7: Add the pastoral manager scope to the current session contract

**What**: Surface the existing API-held `pastoral_queue` assignment through the Manager session and dashboard scope union.
**Where**: `src/app/api/manager/session/route.ts`, `src/components/manager/manager-dashboard.tsx` and co-located test.
**Depends on**: T2
**Reuses**: Existing `EVENT_MANAGER` session validation and scope switching.
**Requirement**: PQUEUE-05, PQUEUE-15

**Done when**:

- [ ] Only an assigned `EVENT_MANAGER` sees the pastoral console.
- [ ] Unsupported or absent scope remains on the existing no-scope state.
- [ ] The API identity field used for scope is documented before coding; if absent upstream, this task is blocked rather than guessed.

**Tests**: Unit (React and route).  
**Gate**: Full.  
**Commit**: `feat(manager): expose pastoral queue scope`

### T8: Add the global pastoral configuration service

**What**: Implement realtime read/update of `config/default` with defaults and validation for opening, push enablement and delivery delay.
**Where**: `src/lib/pastoral-queue/config-service.ts` and co-located test.
**Depends on**: T2
**Reuses**: The legacy document location but not its configurable proximity threshold or WhatsApp fields.
**Requirement**: PQUEUE-16, PQUEUE-17, PQUEUE-18, PQUEUE-19

**Done when**:

- [ ] `isQueueOpen` controls both types globally.
- [ ] `notificationDelaySeconds` accepts integers from 0 to 300 and invalid writes preserve the prior document.
- [ ] The service never exposes a mutable 10/5/called milestone.

**Tests**: Unit.  
**Gate**: Full.  
**Commit**: `feat(pastoral-queue): add global queue configuration`

### T9: Add the manager queue console

**What**: Render the two operational queues, call action, two-minute alert and resolution controls in the scoped Manager dashboard.
**Where**: `src/components/manager/pastoral-queue-console.tsx` with co-located test, plus manager dashboard composition.
**Depends on**: T4, T5, T7, T8
**Reuses**: Dashboard panels, buttons, error states and session handling.
**Requirement**: PQUEUE-05, PQUEUE-06, PQUEUE-07, PQUEUE-08, PQUEUE-09

**Done when**:

- [ ] Empty queue, current call, 2-minute alert, completed and no-show states render distinctly.
- [ ] Controls call only the service transitions allowed for the entry state.
- [ ] The alert does not auto-remove a participant.
- [ ] The Gestor can open/close both queues and configure push/atraso without changing milestones.

**Tests**: Unit (React).  
**Gate**: Full.  
**Commit**: `feat(manager): add pastoral queue console`

### T10: Add the Admin pastoral overview

**What**: Add a read-only Admin navigation item and live overview of both queue types.
**Where**: `src/components/admin/pastoral-queue-overview.tsx`, `src/components/admin/admin-dashboard.tsx` and co-located tests.
**Depends on**: T5
**Reuses**: Admin navigation, sections, loading and empty-state components.
**Requirement**: PQUEUE-14, PQUEUE-15

**Done when**:

- [ ] Admin sees totals, next entries and currently called person for both types.
- [ ] No call/conclusion/absence controls appear in this Admin overview.
- [ ] Existing Admin session protection and tabs keep working.

**Tests**: Unit (React).  
**Gate**: Full.  
**Commit**: `feat(admin): add pastoral queue overview`

### T11: Create the deployable Firebase Function and Firestore boundary

**What**: Create the isolated Firebase Functions project, Firestore rules/indexes, emulator configuration and secret documentation.
**Where**: `functions/`, `firebase.json`, `firestore.rules`, `firestore.indexes.json`, `.env.example`.
**Depends on**: T1, T2
**Reuses**: `southamerica-east1` deployment choice from the legacy project; never reuses its credentials.
**Requirement**: PQUEUE-05, PQUEUE-09, PQUEUE-10, PQUEUE-11, PQUEUE-13, PQUEUE-16, PQUEUE-17, PQUEUE-18, PQUEUE-19

**Done when**:

- [ ] Function project builds and declares `test`/`test:emulator` commands.
- [ ] Rules and indexes cover all planned collection queries and no application secret is versioned.
- [ ] Emulator tests demonstrate intended allowed/denied access as documented by the accepted risk boundary.

**Tests**: Emulator integration.  
**Gate**: Function.  
**Commit**: `feat(pastoral-queue): scaffold firebase function boundary`

### T12: Deliver notification intents through the official push API

**What**: Implement the Firestore-triggered Function that claims an intent, calls the targeted official push endpoint with an idempotency key, and records outcome.
**Where**: `functions/src/pastoral-queue/notifications.ts` and co-located test.
**Depends on**: T5, T8, T11, T13
**Reuses**: Existing `externalKey` push subscription association only.
**Requirement**: PQUEUE-10, PQUEUE-11, PQUEUE-13

**Done when**:

- [ ] Pending intent is delivered once per deterministic intent ID.
- [ ] Retry preserves the same idempotency key and no Firestore transaction contains network delivery.
- [ ] API failure records `failed` without rolling back the queue state.
- [ ] Delivery honors `pushEnabled` and `notificationDelaySeconds` while preserving the fixed milestones.

**Tests**: Unit.  
**Gate**: Function.  
**Commit**: `feat(pastoral-queue): deliver targeted push notifications`

### T13: Confirm and document the official targeted-push contract

**What**: Obtain the API contract for individual delivery by `externalKey`, including authentication, idempotency and response/error shape; adapt the Function client to it.
**Where**: `functions/src/pastoral-queue/push-client.ts`, contract documentation and co-located test.
**Depends on**: T11
**Reuses**: Existing `/push/subscribe` identity key; does not call the global Admin campaign endpoint.
**Requirement**: PQUEUE-10, PQUEUE-11, PQUEUE-13

**Done when**:

- [ ] The exact official endpoint is verified from API source or published API documentation, not inferred.
- [ ] Request carries recipient `externalKey`, notification kind and idempotency key.
- [ ] No implementation can silently fall back to a broadcast campaign.

**Tests**: Unit.  
**Gate**: Function.  
**Commit**: `feat(pastoral-queue): integrate official targeted push`

### T14: Verify the participant realtime journey

**What**: Add an end-to-end journey against the Firebase emulator covering entry, concurrent update, leave, completed-type block and in-app modal.
**Where**: `tests/e2e/pastoral-queue.spec.ts` and Firebase emulator test setup.
**Depends on**: T6, T9, T10, T11, T12
**Reuses**: Existing Playwright configuration and PWA build flow.
**Requirement**: PQUEUE-01 through PQUEUE-19

**Done when**:

- [ ] The journey proves all user-visible acceptance criteria and listed Firestore error state.
- [ ] The test uses emulator/fake delivery, never production Firestore or push credentials.
- [ ] Existing E2E journeys continue passing.

**Tests**: E2E.  
**Gate**: E2E.  
**Commit**: `test(pastoral-queue): cover realtime participant journey`

### T15: Publish operational setup and runbook

**What**: Document Firebase setup, required secrets, role assignment, event reset, push dependency, emulator workflow and the 2-minute operator flow.
**Where**: `docs/pastoral-queues.md`, `README.md` and deployment checklist.
**Depends on**: T11, T12, T13, T14
**Reuses**: Existing README validation and PWA operational documentation style.
**Requirement**: PQUEUE-05, PQUEUE-06, PQUEUE-10, PQUEUE-14, PQUEUE-16, PQUEUE-17, PQUEUE-18, PQUEUE-19

**Done when**:

- [ ] A new operator can assign the scope, operate both outcomes and reset the event without reading source code.
- [ ] Required Firebase/API configuration is named but secrets are never written in docs.
- [ ] The runbook records the known direct-Firestore authorization trade-off.

**Tests**: none — documentation layer.  
**Gate**: Complete.  
**Commit**: `docs(pastoral-queue): add setup and operations runbook`

---

## Phase Execution Map

```text
Phase 1:  T1 → T2 → T3 → T4 → T5
Phase 2:  T6 ─┐
           T7 → T8 → T9 ─┼→ T10
Phase 3:  T11 → T13 → T12
Phase 4:  T14 → T15

Cross-phase: T3/T4 → T5; T5 → T6/T10/T12; T4/T5/T7/T8 → T9;
             T6/T9/T10/T11/T12 → T14; T11/T12/T13/T14 → T15.
```

## Task Granularity Check

| Task | Scope | Status |
| --- | --- | --- |
| T1 | Firebase configuration boundary | ✅ Granular |
| T2 | Queue domain model | ✅ Granular |
| T3 | Participant transactions | ✅ Granular |
| T4 | Manager transitions | ✅ Granular |
| T5 | Realtime selectors/intents | ✅ Granular |
| T6 | Participant UI integration | ✅ Granular |
| T7 | Manager scope contract | ✅ Granular |
| T8 | Global configuration service | ✅ Granular |
| T9 | Manager console | ✅ Granular |
| T10 | Admin overview | ✅ Granular |
| T11 | Firebase deploy/rules boundary | ⚠️ Cohesive infrastructure unit |
| T12 | Notification Function | ✅ Granular |
| T13 | Targeted-push API client/contract | ✅ Granular |
| T14 | Realtime E2E journey | ✅ Granular |
| T15 | Operations runbook | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On (task body) | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | None | Phase start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | Phase 1 sequence | ✅ Match |
| T4 | T2 | Phase 1 sequence | ✅ Match |
| T5 | T3, T4 | T3/T4 → T5 | ✅ Match |
| T6 | T3, T5 | T3/T5 → T6 | ✅ Match |
| T7 | T2 | T2 → T7 | ✅ Match |
| T8 | T2 | T2 → T8 | ✅ Match |
| T9 | T4, T5, T7, T8 | T4/T5/T7/T8 → T9 | ✅ Match |
| T10 | T5 | T5 → T10 | ✅ Match |
| T11 | T1, T2 | T1/T2 → T11 | ✅ Match |
| T12 | T5, T8, T11, T13 | T5/T8/T11/T13 → T12 | ✅ Match |
| T13 | T11 | T11 → T13 | ✅ Match |
| T14 | T6, T9, T10, T11, T12 | all shown as cross-phase inputs | ✅ Match |
| T15 | T11, T12, T13, T14 | all shown as cross-phase inputs | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Config | none | none | ✅ OK |
| T2–T5 | Queue domain/service | unit | unit | ✅ OK |
| T6–T7, T9–T10 | React UI | unit | unit | ✅ OK |
| T8 | Queue domain/service | unit | unit | ✅ OK |
| T11 | Rules/config | emulator integration | emulator integration | ✅ OK |
| T12–T13 | Firebase Function | unit | unit | ✅ OK |
| T14 | Participant journey | e2e | e2e | ✅ OK |
| T15 | Documentation | none | none | ✅ OK |
