# DNJ Event Experience Tasks

**Design:** .specs/features/dnj-event-experience/design.md  
**Status:** Draft

## Test Coverage Matrix

> Generated from package scripts, Vitest tests under src, Playwright visual tests and the approved specification. No separate quality guide was found; strong defaults apply.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|---|---|---|---|---|
| UI utility/component | unit | Each acceptance criterion and listed interaction/error branch | src/**/*.test.tsx | npm run test:unit |
| Feature screen | unit | Happy, error, empty, offline and accessibility states in scope | src/features/**/*.test.tsx | npm run test:unit |
| App routing | unit | Screen navigation and no regression of session restoration | src/components/**/*.test.tsx | npm run test:unit |
| Visual surface | visual | Key approved screens at mobile viewports | tests/visual/** | npm run test:visual |

## Gate Check Commands

| Gate Level | When to Use | Command |
|---|---|---|
| Quick | UI unit task | npm run test:unit |
| Build | Each phase | npm run typecheck and npm run lint |
| Full | Final feature | npm run validate |
| Visual | Visual task/final | npm run test:visual |

## Execution Plan

### Phase 1: Shared feedback and form foundation

T1 → T2 → T3

### Phase 2: Critical entry and operational screens

T4 → T5 → T6 → T7

### Phase 3: Navigation and remaining surfaces

T8 → T9 → T10 → T11 → T12 → T13

## Task Breakdown

### T1: Create operation feedback component

**What:** Add reusable accessible error, empty and offline feedback with optional retry.  
**Where:** src/components/ui/operation-feedback.tsx and co-located test  
**Depends on:** None  
**Requirement:** DNJX-01  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(feedback): add reusable operation states

### T2: Enhance field input semantics and validation display

**What:** Associate label/input and render accessible description and error text.  
**Where:** src/components/ui/dnj-controls.tsx and co-located test  
**Depends on:** T1  
**Requirement:** DNJX-02  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(forms): add accessible field feedback

### T3: Align DNJ Game token with official brand green

**What:** Set the game token to #B2D64D and preserve semantic error colors.  
**Where:** src/app/theme.css and focused token test or component assertion  
**Depends on:** None  
**Requirement:** DNJX-01  
**Tests:** unit  
**Gate:** Build  
**Commit:** fix(theme): align game green with official logo

### T4: Convert account registration to two mobile steps

**What:** Split personal data and group selection while preserving entries and step-aware validation.  
**Where:** src/features/auth/auth-screens.tsx and auth screen test  
**Depends on:** T2  
**Requirement:** DNJX-02  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(auth): make registration a two-step flow

### T5: Improve login and OTP recovery states

**What:** Add precise field feedback, OTP delivery status and six-digit paste handling.  
**Where:** src/features/auth/auth-screens.tsx and auth screen test  
**Depends on:** T2  
**Requirement:** DNJX-02  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(auth): clarify login and verification feedback

### T6: Make game scan action orange and remove large scan card

**What:** Apply official green across game emphasis, remove overview scan card and keep orange scanner FAB after onboarding.  
**Where:** src/features/game/game-screen.tsx and game screen test  
**Depends on:** T3  
**Requirement:** DNJX-04  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(game): focus scan action with orange contrast

### T7: Add offline and recoverable scanner states

**What:** Guard scanner entry by network availability and render recoverable validation failures.  
**Where:** src/features/game/game-screen.tsx, src/features/scanner/qr-scanner-modal.tsx and scanner tests  
**Depends on:** T1, T6  
**Requirement:** DNJX-01, DNJX-04  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(scanner): handle offline and validation failures

### T8: Make queue state demonstrative and exit confirmable

**What:** Show mock/update disclosure and require confirmation before leaving the queue.  
**Where:** src/features/queue/queue-screen.tsx and queue screen test  
**Depends on:** T1  
**Requirement:** DNJX-04  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(queue): clarify demonstration status and exit

### T9: Rework Home around current event activity

**What:** Add the Agora no DNJ hero, compact mission and honest schedule/map shortcuts.  
**Where:** src/features/home/home-screen.tsx and home screen test  
**Depends on:** T1  
**Requirement:** DNJX-03  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(home): prioritize current event action

### T10: Add schedule screen and navigation

**What:** Build mock schedule timeline and wire app navigation to it.  
**Where:** src/features/schedule/schedule-screen.tsx, src/components/dnj-app.tsx and tests  
**Depends on:** T9  
**Requirement:** DNJX-03, DNJX-05  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(schedule): add event schedule surface

### T11: Add map screen and navigation

**What:** Build selectable event map details and wire app navigation to it.  
**Where:** src/features/map/map-screen.tsx, src/components/dnj-app.tsx and tests  
**Depends on:** T9  
**Requirement:** DNJX-03, DNJX-05  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(map): add event map surface

### T12: Separate gallery empty and failure states

**What:** Render retryable gallery errors and a contextual empty state.  
**Where:** src/features/gallery/gallery-screen.tsx and gallery screen test  
**Depends on:** T1  
**Requirement:** DNJX-06  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(gallery): distinguish empty and failed loading

### T13: Clarify account theme state

**What:** Expose the selected theme with accessible text in the account preference control.  
**Where:** src/features/account/account-screen.tsx and account screen test  
**Depends on:** None  
**Requirement:** DNJX-06  
**Tests:** unit  
**Gate:** Quick  
**Commit:** feat(account): announce selected theme

## Phase Execution Map

```
Phase 1: T1 → T2 → T3
Phase 2: T4 → T5 → T6 → T7
Phase 3: T8 → T9 → T10 → T11 → T12 → T13
```

## Task Granularity Check

| Task range | Scope | Status |
|---|---|---|
| T1-T3 | One shared component or token each | ✅ |
| T4-T9 | One bounded screen flow each | ✅ |
| T10-T11 | One new screen plus necessary router wiring each | ✅ |
| T12-T13 | One bounded screen each | ✅ |

## Diagram-Definition Cross-Check

| Task | Depends On | Diagram | Status |
|---|---|---|---|
| T1 | None | Phase 1 start | ✅ |
| T2 | T1 | T1 → T2 | ✅ |
| T3 | None | Phase 1 start | ✅ |
| T4 | T2 | T2 → T4 | ✅ |
| T5 | T2 | T2 → T5 | ✅ |
| T6 | T3 | T3 → T6 | ✅ |
| T7 | T1, T6 | T1/T6 → T7 | ✅ |
| T8 | T1 | T1 → T8 | ✅ |
| T9 | T1 | T1 → T9 | ✅ |
| T10 | T9 | T9 → T10 | ✅ |
| T11 | T9 | T9 → T11 | ✅ |
| T12 | T1 | T1 → T12 | ✅ |
| T13 | None | Phase 3 start | ✅ |

## Test Co-location Validation

| Task | Code Layer | Matrix Requires | Task Says | Status |
|---|---|---|---|---|
| T1-T2 | UI component | unit | unit | ✅ |
| T3 | Theme token | unit/build | unit | ✅ |
| T4-T9 | Feature screen | unit | unit | ✅ |
| T10-T11 | Feature + routing | unit | unit | ✅ |
| T12-T13 | Feature screens | unit | unit | ✅ |
