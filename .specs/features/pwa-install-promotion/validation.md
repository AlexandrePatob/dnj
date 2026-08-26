# PWA Install Promotion Validation

**Date**: 2026-07-22  
**Spec**: `.specs/features/pwa-install-promotion/spec.md`  
**Context**: `.specs/features/pwa-install-promotion/context.md`  
**Full diff range**: `9ef79f8..6c1bac6`  
**Correction range**: `602824c..6c1bac6`  
**Verifier**: second independent sub-agent (author != verifier)  
**Restriction observed**: no browser, Playwright, browser control, screenshots, or interactive UAT were executed.

---

## Overall Verdict

**PASS** - all 11 acceptance criteria and all four listed edge cases have precise automated evidence. The session guards, invalid native outcome, unavailable storage behavior, and exact seven-day dismissal that failed the first validation are now implemented and discriminated by tests.

## Task Completion

No `tasks.md` exists for this feature. Completion was assessed directly from the source-of-truth spec/context, both declared diff ranges, the implementation, and the three requested test files.

| Deliverable | Status | Notes |
| --- | --- | --- |
| Chromium native flow | PASS | Prompt is single-use; accepted/installed and dismissed states remain stable for the session. |
| iOS/iPadOS manual flow | PASS | Safari and non-Safari actions and exact copy are asserted. |
| Operational priority/accessibility | PASS | Offline/update notices supersede installation; accessible name, focus, non-color text, safe-area placement, and reduced-motion behavior are asserted. |
| Persistence and failure handling | PASS | Native dismissal and **Agora não** store exactly `now + 7 days`; invalid/rejected prompt and unavailable storage remain session-only. |

---

## Spec-Anchored Acceptance Criteria

Evidence-or-zero was applied to every criterion, including each material conjunction.

| ID | Spec-defined outcome | `file:line` + assertion expression | Result |
| --- | --- | --- | --- |
| PWAIP-01 | Eligible, non-installed and non-snoozed Chromium shows **Instalar app** after `beforeinstallprompt`. | `src/components/pwa/pwa-registrar.test.tsx:112-123` - `expect(event.defaultPrevented).toBe(true)` and `expect(...).toHaveTextContent("available")`; `src/components/pwa/install-promotion.test.tsx:34-42` - named region plus `getByRole("button", { name: "Instalar app" })`. | PASS |
| PWAIP-02 | The participant gesture invokes the native prompt exactly once. | `src/components/pwa/pwa-registrar.test.tsx:120-122` - two action clicks followed by `expect(installPrompt.prompt).toHaveBeenCalledTimes(1)`. | PASS |
| PWAIP-03 | Acceptance or `appinstalled` hides promotion and keeps the installed state for the session. | Accepted: `src/components/pwa/pwa-registrar.test.tsx:123-128`; event: `:216-225` - each dispatches a later eligibility event and asserts status remains `installed` and the later prompt is not called. | PASS |
| PWAIP-04 | Native dismissal or **Agora não** hides promotion for exactly seven days in the same browser. | Native dismissal: `src/components/pwa/pwa-registrar.test.tsx:131-143`; **Agora não** plus remount: `:146-160` - both assert `String(now + 7 * 24 * 60 * 60 * 1000)` and hidden state. | PASS |
| PWAIP-05 | Non-standalone iOS/iPadOS without active dismissal exposes **Como instalar**. | `src/components/pwa/pwa-registrar.test.tsx:178-199` asserts `manual` for iPhone and desktop-UA iPadOS; `src/components/pwa/install-promotion.test.tsx:45-48` locates the exact CTA. | PASS |
| PWAIP-06 | iOS Safari shows exactly **Toque em Compartilhar e depois em Adicionar à Tela de Início.** | `src/components/pwa/install-promotion.test.tsx:45-52` asserts the exact instruction visible and the Safari-opening preface absent. | PASS |
| PWAIP-07 | Other iOS/iPadOS browsers prepend **Abra esta página no Safari.** | `src/components/pwa/install-promotion.test.tsx:55-59` asserts both exact strings visible; registrar evidence at `src/components/pwa/pwa-registrar.test.tsx:184-188` classifies CriOS as non-Safari. | PASS |
| PWAIP-08 | Standalone mode keeps promotion hidden. | `src/components/pwa/pwa-registrar.test.tsx:202-214` - standalone media query followed by `expect(...).toHaveTextContent("installed")`; the view renders no promotion for `installed`. | PASS |
| PWAIP-09 | Unsupported/non-applicable installation remains hidden without blocking content. | `src/components/pwa/install-promotion.test.tsx:20-23` - empty DOM for `unavailable`; `src/components/pwa/pwa-registrar.test.tsx:295-299` proves children/actions remain available. | PASS |
| PWAIP-10 | Offline or update available hides installation and preserves the operational notice. | `src/components/pwa/install-promotion.test.tsx:25-32` asserts promotion absence; `src/components/pwa/connectivity-status.test.tsx:22-33` asserts **Sem conexão**/**Nova versão disponível** and absence of idle installation content. | PASS |
| PWAIP-11 | Visible promotion is a region named **Instalar DNJ Game**, has visible keyboard focus, textual cues, and reduced-motion support. | `src/components/pwa/install-promotion.test.tsx:34-43` asserts named region and text; `:62-77` asserts `focus-visible:outline`, `motion-reduce:transition-none`, safe-area positions, and installing disabled state. | PASS |

**Status**: 11/11 acceptance criteria matched the exact spec outcome; 0 uncovered criteria; 0 spec-precision gaps.

---

## Edge Cases

| Edge case | Evidence | Result |
| --- | --- | --- |
| Repeated `beforeinstallprompt` replaces the pending reference without duplicates. | `src/components/pwa/pwa-registrar.test.tsx:228-239` - first prompt not called; latest called once. | PASS |
| `prompt()` rejection or invalid choice hides for the session without technical error or seven-day persistence. | Rejection: `src/components/pwa/pwa-registrar.test.tsx:241-251`; invalid outcome: `:253-261` - status `unavailable`, storage key null, and later eligibility still hidden. | PASS |
| Unavailable local storage still permits install/dismiss during the session. | Dismissal: `src/components/pwa/pwa-registrar.test.tsx:263-273`; accepted install with failed cleanup: `:275-285` - later eligibility cannot reopen either state. | PASS |
| Unmount removes installation listeners. | `src/components/pwa/pwa-registrar.test.tsx:287-293` asserts removal of `beforeinstallprompt` and `appinstalled` listeners. | PASS |

Implementation review corroborates the outcomes: `src/components/pwa/pwa-registrar.tsx:119-120` owns `installedThisSession`/`dismissedThisSession`; `:145-160` separates accepted, dismissed, invalid, and rejected results; `:181-190` guards all later eligibility events.

---

## Discrimination Sensor

Scratch state: temporary copies under `src/__validation_mutation__`; only the copies were mutated, targeted tests were executed, and the directory was deleted after the sensor. The real implementation/tests were never changed.

| Mutation | Scratch file:line | Behavior-level fault | Result |
| --- | --- | --- | --- |
| M1 | `pwa-registrar.tsx:146` | Set `installedThisSession` to false after an accepted choice. | KILLED - 2/24 targeted tests failed, including later-prompt session assertions. |
| M2 | `pwa-registrar.tsx:155` | Cleared `dismissedThisSession` for an invalid native outcome. | KILLED - 1/24 targeted tests failed because a later prompt became `available`. |
| M3 | `pwa-registrar.tsx:64` | Changed dismissal expiration from `now + 7 days` to `now - 7 days`. | KILLED - 2/24 targeted tests failed, covering native dismissal and **Agora não**. |

**Sensor depth**: lightweight, three targeted high-risk mutations.  
**Result**: 3/3 killed - PASS.

---

## Gate Check

Only the explicitly permitted gates were used.

| Command | Result | Evidence |
| --- | --- | --- |
| `npm.cmd run test:unit` | PASS | 12/12 files; 110/110 tests passed; 0 failed; 0 skipped. |
| `npm.cmd run typecheck` | PASS | Exit 0 (`tsc --noEmit`). |
| `npm.cmd run lint` | PASS with warnings | Exit 0; 0 errors, 144 warnings. Warnings are existing generated/skill-tree/project noise; no lint error blocks this feature. |
| `npm.cmd run build` | PASS (orchestrator evidence) | The root/orchestrator independently ran the final build with authorized access and reported exit 0. It was not repeated here to avoid network/font and generated-worker side effects. |

**Test-count integrity**: base `9ef79f8` had 89 statically declared tests (recorded by the first independent validation); the current runtime has 110. Delta: +21; no skips, deleted tests, or weakened assertions were found in the feature diff.

---

## Code Quality

| Principle | Status | Notes |
| --- | --- | --- |
| Minimum code / no speculative abstraction | PASS | Two refs are the minimum in-memory representation required by the session rules. |
| Surgical changes / no scope creep | PASS | Correction range changes only registrar behavior and its focused tests. |
| Matches existing patterns/style | PASS | Context/ref state, local-storage guards, theme tokens, Motion, and existing operational notice composition are preserved. |
| Payload/conjunction assertions | PASS | Exact status, timestamp, storage absence, prompt call count, copy, and later-event stability are asserted. |
| Per-criterion automated coverage | PASS | 11/11 ACs plus four listed edge cases have direct evidence. |
| Every in-scope test is claimed | PASS | Tests map to a requirement, listed edge case, or existing PWA regression behavior. |
| Senior-engineer approval | PASS | Invalid outcomes do not become persistent refusals; storage failures degrade to stable session state. |
| Guidelines followed | PASS | `tlc-spec-driven/references/coding-principles.md`; strong project-local patterns applied. |

Unrelated dirty files observed and preserved: `.gitignore`, `tests/e2e/pwa-flow.spec.ts`, `.specs/LESSONS.md`, and `.specs/lessons.json`.

---

## Requirement Traceability

The verifier was authorized to update only this report, so `spec.md` remains unchanged.

| Requirement | Spec status | Validation status |
| --- | --- | --- |
| PWAIP-01-04 | Pending | Verified |
| PWAIP-05-07 | Pending | Verified |
| PWAIP-08-11 | Pending | Verified |

No lesson was distilled: this re-verification is a clean PASS with no surviving mutant, failed/uncovered AC, spec-precision gap, or `SPEC_DEVIATION`.

## Summary

**Overall**: Ready.  
**Spec-anchored check**: 11/11 ACs matched; 0 gaps.  
**Gate**: unit, typecheck, lint, and final production build passed.  
**Sensor**: 3/3 mutants killed.  
**Issues found**: none.
