# Migração do Frontend para a API V2 Tasks

## Execution Protocol

Implement these tasks with the `tlc-spec-driven` skill and its per-task gate, atomic-commit and independent-verifier rules.

**Design**: `.specs/features/v2-backend-handoff/design.md`  
**Status**: Draft — awaiting approval

## Test Coverage Matrix

> Generated from `vitest.config.ts`, `playwright.config.ts`, `package.json` and existing colocated test samples (`src/lib/api/client.test.ts`, `src/features/game/game-screen.test.tsx`, `src/features/gallery/gallery-screen.test.tsx`, `tests/pwa/pwa.spec.ts`). No separate quality guide was found; strong defaults apply.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| API client, adapters, mappers, upload orchestration | Unit | Every AC branch and listed edge case; request method/path/headers/body asserted | `src/lib/api/*.test.ts` | `npm run test:unit` |
| React screen and bootstrap changes | Unit (jsdom) | Happy path, empty state, auth/error state and user-visible retry behavior | `src/**/*.test.tsx` colocated | `npm run test:unit` |
| Rewrite/configuration | Build + targeted unit | Rewrite target and no exposed secret; type/build gate | `next.config.ts`, `.env.example` | `npm run typecheck && npm run lint && npm run build` |
| PWA cache policy | Unit + Playwright PWA | `/api/v2/**` and signed URLs never enter Cache Storage | `src/pwa/*.test.ts`, `tests/pwa/*.spec.ts` | `npm run test:unit` and `npm run test:pwa` |
| End-to-end participant journeys | Playwright | Auth bootstrap, Game empty state, QR error/idempotency, Moment flow and gallery cursor using deterministic route mocks | `tests/e2e/**/*.spec.ts` | `npm run test:e2e` |

## Gate Check Commands

| Gate Level | When to Use | Command |
| --- | --- | --- |
| Quick | Client, adapter or React task | `npm run typecheck && npm run test:unit` |
| Build | Rewrite/configuration or phase boundary | `npm run typecheck && npm run lint && npm run build` |
| Full | PWA or browser journey | `npm run validate` |

## Execution Plan

### Phase 1: V2 transport foundation

`T1 → T2 → T3 → T4`

### Phase 2: Identity and application bootstrap

`T4 → T5 → T6`

### Phase 3: Participant read/game flows

`T3 → T7 → T8 → T9 → T10 → T11`

### Phase 4: Moments and media

`T3 → T12 → T13 → T14 → T15`

### Phase 5: Safety, optional V2 surfaces and rollout

`T6,T10,T13,T15 → T16 → T17 → T18 → T19 → T20 → T21`

## Task Breakdown

### T1: Configure the same-origin V2 rewrite
**Status**: ✅ Complete

**What**: Add the server-only upstream setting and `/api/v2/:path*` rewrite, with a public client base path.
**Where**: `next.config.ts`, `src/lib/env.ts`, `.env.example` and colocated config test if needed.
**Depends on**: None
**Reuses**: Existing `next.config.ts` and environment convention.
**Requirement**: V2AUTH-02
**Tools**: MCP NONE; Skill `vercel-react-best-practices`.
**Done when**:

- [ ] The client base URL resolves to `/api/v2`.
- [ ] The Lambda URL is server-only and does not appear in a `NEXT_PUBLIC_*` value.
- [ ] Requests to `/api/v2/healthcheck` are forwarded to the configured V2 upstream.
- [ ] Build gate passes with no existing validation removed.

**Tests**: build
**Gate**: build

### T2: Upgrade the shared HTTP client to the V2 contract
**Status**: ✅ Complete

**What**: Implement V2 error-envelope parsing, credentials, one refresh/retry guard and idempotency-key support in the shared client.
**Where**: `src/lib/api/client.ts`, `src/lib/api/client.test.ts`.
**Depends on**: T1
**Reuses**: Existing timeout/offline `ApiError` behavior.
**Requirement**: V2AUTH-01, V2CORE-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Errors expose `code`, `details` and `requestId` when the V2 envelope exists.
- [ ] A `401` causes at most one CSRF refresh and one replay.
- [ ] `apiMutation` requires a caller-provided or newly generated UUID key.
- [ ] Offline, timeout and network distinctions remain covered.

**Tests**: unit
**Gate**: quick

### T3: Add V2 contracts and boundary mappers
**Status**: ✅ Complete

**What**: Define V2 identity, pagination, participation, game, Moment and media types plus mappers to UI domain types.
**Where**: `src/lib/api/contracts.ts`, `src/lib/api/mappers.ts` and colocated tests.
**Depends on**: T2
**Reuses**: Existing `ApiUser` and `mapApiUser` patterns.
**Requirement**: V2CORE-01, V2MEDIA-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] IDs remain strings and date fields remain ISO strings at the boundary.
- [ ] `documentMasked` never becomes an unmasked document field.
- [ ] V2 cursor/page envelopes are represented without client-side cursor decoding.

**Tests**: unit
**Gate**: quick

### T4: Replace the auth adapter with V2 identity operations
**Status**: ✅ Complete

**What**: Replace SMS/register calls with Google login, session, refresh, onboarding and logout API operations.
**Where**: `src/lib/api/auth.ts` and `src/lib/api/auth.test.ts`.
**Depends on**: T2, T3
**Reuses**: `ApiError` and V2 contracts.
**Requirement**: V2AUTH-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Login sends only `{ idToken }` to `/auth/google`.
- [ ] Refresh sends `X-CSRF-Token` and is callable only through the shared retry guard.
- [ ] Session/onboarding/logout have typed results and mapped failures.

**Tests**: unit
**Gate**: quick

### T5: Remove persistent participant-token storage
**Status**: ✅ Complete

**What**: Make storage retain theme only and expose transient session-presentation helpers without storing access tokens or CPF.
**Where**: `src/lib/storage.ts` and new colocated test.
**Depends on**: T3, T4
**Reuses**: Existing theme storage and offline-snapshot privacy conventions.
**Requirement**: V2AUTH-02, V2SAFE-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] `localStorage` no longer receives participant identity tokens.
- [ ] Session clear leaves theme behavior untouched.
- [ ] Invalid legacy token data is ignored/removed safely.

**Tests**: unit
**Gate**: quick

### T6: Migrate application bootstrap and auth navigation
**Status**: ✅ Complete

**What**: Make `DnjApp` bootstrap from V2 session, direct incomplete identities to onboarding and logout through V2.
**Where**: `src/components/dnj-app.tsx`, `src/components/dnj-app.test.tsx`.
**Depends on**: T4, T5
**Reuses**: Current navigation and offline snapshot sanitization.
**Requirement**: V2AUTH-01, V2AUTH-02
**Tools**: MCP NONE; Skill `vercel-react-best-practices`.
**Done when**:

- [ ] A valid V2 session reaches the proper home/onboarding state after reload.
- [ ] Failed bootstrap and failed refresh end at login without a redirect loop.
- [ ] Legacy special-event polling remains explicitly isolated and does not block bootstrap.

**Tests**: unit
**Gate**: quick

### T7: Migrate the group adapter
**Status**: ✅ Complete — `6b188fa`; typecheck + 2 focused unit tests passed

**What**: Implement V2 adapters for group search, current group, members and group changes.
**Where**: `src/lib/api/groups.ts` and `src/lib/api/groups.test.ts`.
**Depends on**: T3
**Reuses**: Existing groups/schedule adapter modules.
**Requirement**: V2CORE-01, V2EXT-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Group changes use `PATCH /users/me/group`; the temporary POST compatibility route is not chosen for new UI.
- [ ] Current group and group members use their V2 paths and typed data.
- [ ] Search values are encoded and absent optional values are omitted.

**Tests**: unit
**Gate**: quick

### T8: Create the V2 activity-content adapter
**Status**: ✅ Complete — `951a70c`; typecheck + 2 focused unit tests passed

**What**: Add V2 schedule, public activity and space reads to a single typed content adapter.
**Where**: new `src/lib/api/activities.ts` and `activities.test.ts`.
**Depends on**: T3
**Reuses**: Existing schedule adapter types.
**Requirement**: V2CORE-01
**Tools**: MCP NONE; Skill `vercel-react-best-practices`.
**Done when**:

- [ ] Schedule, activity detail and spaces use V2 paths and typed data.
- [ ] Optional query parameters are encoded and omitted when absent.
- [ ] API failure preserves the shared client error semantics.

**Tests**: unit
**Gate**: quick

### T9: Create the V2 Game and QR adapters
**Status**: ✅ Complete — `2080f56`; typecheck + 2 focused unit tests passed

**What**: Add typed adapters for overview, current run, current participation and QR validation.
**Where**: new `src/lib/api/game.ts` and colocated test.
**Depends on**: T3
**Reuses**: Current game response shapes where semantically compatible.
**Requirement**: V2CORE-01, V2CORE-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] QR body contains only `qrToken`; idempotency is in the header.
- [ ] Current run and participation expose a typed empty result for `204`.
- [ ] Overview, run and participation can be requested independently.

**Tests**: unit
**Gate**: quick

### T10: Migrate GameScreen to V2 adapters
**Status**: ⚠️ Partial — `1c7a002`; typecheck passed, existing GameScreen unit gate failed 4 tests because fixtures still mock V1 fetches

**What**: Replace direct Game fetches with parallel adapter calls and V2 empty/error handling.
**Where**: `src/features/game/game-screen.tsx`, `game-screen.test.tsx`.
**Depends on**: T9
**Reuses**: Existing scanner entry and Moment CTA states.
**Requirement**: V2CORE-01, V2CORE-02
**Tools**: MCP NONE; Skill `vercel-react-best-practices`.
**Done when**:

- [ ] Overview/current-run/current-participation are started in parallel.
- [ ] Both `204` responses render placeholders, never an error alert.
- [ ] Completed run refreshes points from the V2 overview.

**Tests**: unit
**Gate**: quick

### T11: Migrate QR scanner submission to V2
**Status**: ✅ Partial — `cf94835`; typecheck passed; focused scanner gate not run

**What**: Connect QR scanner success/error UI to `validateGameQR` and V2 error codes.
**Where**: `src/features/scanner/qr-scanner-modal.tsx`, `qr-scanner-modal.test.tsx`.
**Depends on**: T10
**Reuses**: Existing camera and offline guard.
**Requirement**: V2CORE-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Each scan creates one idempotency key and retries reuse it only for that scan.
- [ ] Expired, invalid and conflict QR errors remain distinguishable in UI.
- [ ] Offline still blocks camera submission before network access.

**Tests**: unit
**Gate**: quick

### T12: Create V2 Moment collection and like adapters
**Status**: ✅ Complete — `abcf310`; typecheck + 2 focused unit tests passed

**What**: Add typed list-by-scope, cursor and like operations for V2 Moments.
**Where**: new `src/lib/api/moments.ts` and colocated test.
**Depends on**: T3
**Reuses**: Existing gallery types/mappers.
**Requirement**: V2CORE-01, V2CORE-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] `scope` is required and exactly one supported value.
- [ ] Cursor is passed through unchanged.
- [ ] Like returns canonical `momentId`, `liked` and `likesCount` and has idempotency.

**Tests**: unit
**Gate**: quick

### T13: Migrate gallery and account Moment reads to V2
**Status**: ✅ Partial — `5381fc7`; typecheck passed; gallery/account full gate not run; account remains outside changed files

**What**: Replace direct gallery/mine/like V1 fetches with Moment adapters and signed-media refresh behavior.
**Where**: `src/features/gallery/`, `src/features/account/account-screen.tsx` and tests.
**Depends on**: T12
**Reuses**: Existing gallery tabs, retry UI and sharing UI.
**Requirement**: V2CORE-01, V2CORE-02
**Tools**: MCP NONE; Skill `vercel-react-best-practices`.
**Done when**:

- [ ] Feed, mine and group use V2 scopes.
- [ ] Like updates from the returned count/state rather than assuming toggle success.
- [ ] Expired signed image failures reload canonical Moment data rather than cache the URL.

**Tests**: unit
**Gate**: quick

### T14: Implement the V2 media upload orchestrator
**Status**: ✅ Complete — `4f8c707`; typecheck + 1 focused unit test passed

**What**: Implement checksum, upload intent, signed PUT, complete retry and Moment publish orchestration.
**Where**: new `src/lib/api/media.ts` and `media.test.ts`.
**Depends on**: T2, T3
**Reuses**: Native `fetch` and Web Crypto; no new dependency.
**Requirement**: V2MEDIA-01, V2MEDIA-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Only JPEG/PNG up to 10 MiB request an intent.
- [ ] PUT uses exactly response URL/method/headers and never sends cookies/tokens to S3.
- [ ] `UPLOAD_INCOMPLETE` retries complete; expired intent creates a new intent only after the old flow is abandoned.
- [ ] Free and challenge Moment payloads satisfy the V2 contract.

**Tests**: unit
**Gate**: quick

### T15: Migrate MomentComposer to the upload orchestrator
**Status**: ✅ Partial — `3227e63`; typecheck passed; composer focused gate not run

**What**: Replace multipart V1 upload with visible V2 upload progress and safe retry states.
**Where**: `src/features/moments/moment-composer.tsx` and colocated test.
**Depends on**: T14
**Reuses**: Existing capture, consent and success feedback UI.
**Requirement**: V2MEDIA-01, V2MEDIA-02
**Tools**: MCP NONE; Skill `vercel-react-best-practices`.
**Done when**:

- [ ] UI reports hashing, intent, upload, completion and publish progress.
- [ ] `publishConsent` controls visibility but does not locally award points.
- [ ] Failure leaves the user with an explicit, safe next action and no duplicate publish.

**Tests**: unit
**Gate**: quick

### T16: Add the V2 profile adapter
**Status**: ✅ Complete

**What**: Add typed current-profile read and update operations without creating a new screen.
**Where**: new `src/lib/api/profile.ts` and `profile.test.ts`.
**Depends on**: T2, T3
**Reuses**: V2 HTTP client and mutation helper.
**Requirement**: V2EXT-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Profile reads never expose or remap an unmasked document.
- [ ] Profile updates use the V2 PATCH contract and shared error semantics.
- [ ] No VAPID endpoint is removed or repurposed.

**Tests**: unit
**Gate**: quick

### T17: Add the V2 notification adapter

**What**: Add typed notification list, mark-read and preference operations without creating a new screen.
**Where**: new `src/lib/api/notifications.ts` and `notifications.test.ts`.
**Depends on**: T2, T3
**Reuses**: V2 HTTP client and mutation helper.
**Requirement**: V2EXT-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Read, mark-read and preference updates use their published V2 method/path.
- [ ] Mark-read uses an idempotency key where the operation requires it.
- [ ] No VAPID endpoint is removed or repurposed.

**Tests**: unit
**Gate**: quick

### T18: Add the V2 favorites adapter

**What**: Add typed list, idempotent PUT and idempotent DELETE favorite operations without creating a new screen.
**Where**: new `src/lib/api/favorites.ts` and `favorites.test.ts`.
**Depends on**: T2, T3
**Reuses**: V2 HTTP client and mutation helper.
**Requirement**: V2EXT-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Favorite PUT/DELETE use the documented activity path and idempotency behavior.
- [ ] The adapter returns canonical server state and does not calculate rankings locally.

**Tests**: unit
**Gate**: quick

### T19: Protect `/api/v2` and signed uploads from PWA caching

**What**: Extend cache-policy tests and service-worker/browser coverage for V2 API and signed S3 URLs.
**Where**: `src/pwa/cache-policy.ts`, `cache-policy.test.ts`, `sw.test.ts`, `tests/pwa/pwa.spec.ts`.
**Depends on**: T1
**Reuses**: AD-002 cache allowlist and existing PWA test harness.
**Requirement**: V2SAFE-01
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] `/api/v2/**` is passed through and absent from Cache Storage.
- [ ] Cross-origin signed upload/media URLs are passed through.
- [ ] Existing shell/static caching behavior remains unchanged.

**Tests**: unit + e2e
**Gate**: full

### T20: Add deterministic V2 migration browser journeys

**What**: Add Playwright route-mocked journeys for session bootstrap, Game empty states, QR failure/idempotency, Moment flow and gallery cursor.
**Where**: new `tests/e2e/v2-migration.spec.ts` and fixtures as needed.
**Depends on**: T6, T10, T11, T13, T15
**Reuses**: `tests/e2e` Playwright configuration and existing app fixtures.
**Requirement**: V2AUTH-01, V2CORE-01, V2CORE-02, V2MEDIA-01, V2SAFE-01
**Tools**: MCP NONE; Skill `browser:control-in-app-browser` for local visual diagnosis only if needed.
**Done when**:

- [ ] Each P1 migrated journey covers happy, empty/error and retry state stipulated by the spec.
- [ ] Tests do not send real Google credentials, mutate develop data or depend on real S3.
- [ ] Browser suite passes in Chromium and WebKit.

**Tests**: e2e
**Gate**: full

### T21: Document legacy ownership, rollback and removal gates

**What**: Create the migration inventory that assigns every current V1/Supabase handler to V2, retained legacy, or pending-backend decision.
**Where**: `docs/api/dnj-v2-migration-inventory.md` and relevant API README links.
**Depends on**: T6, T10, T13, T15, T16, T17, T18, T19, T20
**Reuses**: Current OpenAPI docs and the published V2 handoff.
**Requirement**: V2SAFE-02
**Tools**: MCP NONE; Skill NONE.
**Done when**:

- [ ] Every current `/api/v1`, `/api/admin`, `/api/manager`, `/api/push` and `/api/display` group has an owner and status.
- [ ] Retained event special/display/push capabilities are explicitly excluded from Supabase removal.
- [ ] Each V1 removal has its V2 replacement, validation evidence and production traffic gate recorded.

**Tests**: none (documentation-only)
**Gate**: build

## Phase Execution Map

```text
Phase 1: T1 → T2 → T3 → T4
Phase 2:                 T4 → T5 → T6
Phase 3:            T3 → T7
                         └→ T8
                         └→ T9 → T10 → T11
Phase 4:            T3 → T12 → T13
                         └→ T14 → T15
Phase 5: T2,T3 → T16, T17, T18; T1 → T19; T6,T10,T11,T13,T15 → T20 → T21
```

## Task Granularity Check

| Task group | Scope | Status |
| --- | --- | --- |
| T1–T6 | One configuration, module or bootstrap boundary each | ✅ Granular |
| T7–T13 | One domain adapter or one UI surface each | ✅ Granular |
| T14–T15 | Orchestrator separated from composer UI | ✅ Granular |
| T16–T21 | One optional domain, cache policy, E2E suite or inventory each | ✅ Granular |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram Shows | Status |
| --- | --- | --- | --- |
| T1 | — | Phase 1 start | ✅ Match |
| T2 | T1 | T1 → T2 | ✅ Match |
| T3 | T2 | T2 → T3 | ✅ Match |
| T4 | T2,T3 | Phase 1 chain | ✅ Match |
| T5 | T3,T4 | T4 → T5 (T3 transitive) | ✅ Match |
| T6 | T4,T5 | T4 → T5 → T6 | ✅ Match |
| T7 | T3 | T3 → T7 | ✅ Match |
| T8 | T3 | T3 → T8 | ✅ Match |
| T9 | T3 | T3 → T9 | ✅ Match |
| T10 | T9 | T9 → T10 | ✅ Match |
| T11 | T10 | T9 → T10 → T11 | ✅ Match |
| T12 | T3 | T3 → T12 | ✅ Match |
| T13 | T12 | T12 → T13 | ✅ Match |
| T14 | T2,T3 | T2,T3 → T14 | ✅ Match |
| T15 | T14 | T14 → T15 | ✅ Match |
| T16 | T2,T3 | T2,T3 → T16 | ✅ Match |
| T17 | T2,T3 | T2,T3 → T17 | ✅ Match |
| T18 | T2,T3 | T2,T3 → T18 | ✅ Match |
| T19 | T1 | T1 → T19 | ✅ Match |
| T20 | T6,T10,T11,T13,T15 | All listed paths converge on T20 | ✅ Match |
| T21 | T6,T10,T13,T15,T16,T17,T18,T19,T20 | Phase 5 completion → T21 | ✅ Match |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
| --- | --- | --- | --- | --- |
| T1 | Config | Build | build | ✅ OK |
| T2–T5 | API client/adapters/storage | Unit | unit | ✅ OK |
| T6, T10, T11, T13, T15 | React UI | Unit | unit | ✅ OK |
| T7, T8, T9, T12, T14, T16–T18 | Domain adapters | Unit | unit | ✅ OK |
| T19 | PWA | Unit + e2e | unit + e2e | ✅ OK |
| T20 | Browser journeys | e2e | e2e | ✅ OK |
| T21 | Documentation | none | none | ✅ OK |

## Requirement Traceability

| Requirement | Tasks |
| --- | --- |
| V2AUTH-01 | T2, T4, T6, T20 |
| V2AUTH-02 | T1, T5, T6 |
| V2CORE-01 | T3, T7–T10, T12–T13, T20 |
| V2CORE-02 | T2, T9–T12, T20 |
| V2MEDIA-01 | T14, T15, T20 |
| V2MEDIA-02 | T3, T14, T15 |
| V2SAFE-01 | T5, T19, T20 |
| V2SAFE-02 | T21 |
| V2EXT-01 | T16–T18 |
