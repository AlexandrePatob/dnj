# DNJ Event Experience Validation

**Date:** 2026-07-24  
**Spec:** `.specs/features/dnj-event-experience/spec.md`  
**Diff range:** `007706f^..aca3fca`  
**Verifier:** independent sub-agent (author != verifier)

## Verdict

**PASS — no genuine implementation blocker remains.** No E2E, Playwright, visual, or build checks were run, per the user's explicit scope. The three authorized gates passed.

## Spec-Anchored Acceptance Criteria

| Criterion | Evidence (`file:line` + assertion) | Result |
| --- | --- | --- |
| P1 feedback: Portuguese retryable error, distinct empty state, accessible dynamic status | `operation-feedback.test.tsx:11-15` asserts error/retry and assertive live region; `:21-23` asserts empty/no retry and polite live region; `gallery-screen.test.tsx:22-26` asserts error then retryable empty state. | PASS |
| P1 feedback: offline network action is blocked before operation | `game-screen.test.tsx:23-30` sets offline, clicks scan, asserts exact Portuguese alert and absence of scanner. | PASS |
| P1 entry: invalid CPF, email, phone and code have specific guidance | `auth-screens.test.tsx:31-40` asserts CPF/email guidance; `:20-27` asserts email/WhatsApp guidance; `:43-52` asserts invalid-code guidance. | PASS |
| P1 entry: OTP masked email, delivery status and six-digit paste | `auth-screens.test.tsx:43-52` asserts digit six is `6`, verification enabled, `a***@example.com`, delivery text and invalid-code recovery. | PASS |
| P1 entry: labels are programmatically associated | `dnj-controls.test.tsx:7-10` resolves the field by label; `:23-26` asserts `aria-describedby`, `aria-invalid` and alert. | PASS |
| P1 entry: two registration steps retain data and invalid first step is blocked/indicated | `auth-screens.test.tsx:6-18` asserts retained name/email after back; `:20-27` asserts disabled continuation and exact invalid email/phone messages. | PASS |
| P1 Home: current mock activity, place/time and contextual CTA | `home-screen.test.tsx:10-20` asserts mock label, `Espaço Juventude · 14:00`, and both schedule CTAs. | PASS |
| P1 Home: honest shortcuts and schedule/map destinations | `home-screen.test.tsx:15-22` asserts schedule and map handlers; `dnj-app.test.tsx:68-76` clicks Home map shortcut and asserts `Mapa do evento`; `dnj-app.tsx:264-266` wires schedule/map screens. | PASS |
| P1 game/queue: offline scanner and recoverable QR failure | `game-screen.test.tsx:23-30` asserts offline preflight; `qr-scanner-modal.test.tsx:18-26` asserts invalid-QR message, retry camera action and retained scanner heading. | PASS |
| P1 queue: mock status/update and confirmation before exit | `queue-screen.test.tsx:7-17` asserts demonstrative/update text, confirmation dialog, and exit only after confirmation. | PASS |
| P2 schedule: Agora, Em seguida, Mais tarde, time/place and mock disclosure | `schedule-screen.test.tsx:7-16` asserts all three sections, disclosure and the three time/place pairs. | PASS |
| P2 map: actionable pins, selection detail and mock disclosure | `map-screen.test.tsx:5` clicks `Espaço Esperança` and asserts its heading/detail plus mock disclosure. | PASS |
| P2 gallery/account: gallery error/retry/empty/moderation text and accessible theme state | `gallery-screen.test.tsx:14-26`, `:29-40`, `:43-49` assert all gallery states and `Em moderação`; `account-screen.test.tsx:14-30` asserts both textual theme states and actionable controls. | PASS |
| Visual addendum: brand green, orange scanner entry, overview QR card removed | `theme.test.ts:8-15` asserts `#b2d64d`; `game-screen.test.tsx:17-20` asserts floating primary scan action and absence of prior overview card. | PASS |

## Edge Cases

- Gallery retry guards unmounted updates at `gallery-screen.tsx:21`; implementation review found no state update after cleanup.
- Offline snapshot is marked read-only with its capture time at `dnj-app.tsx:275-282`.
- Gallery empty state is covered at `gallery-screen.test.tsx:29-40`; fixed mock schedule/map fixtures always contain their demonstrated content.
- Accessible labels, alerts and dialog are directly covered in the tests above.

## Discrimination Sensor

| Mutation | Target | Result |
| --- | --- | --- |
| Removed offline branch by changing `if (!isOnline)` to `if (false)` | `game-screen.tsx:53` | **Killed:** focused game test failed because the alert disappeared and scanner opened. Restored. |
| Replaced Home map action with no-op | `home-screen.tsx:274` | **Killed:** focused Home and app-routing tests failed because callback and map surface did not occur. Restored. |

**Sensor:** 2/2 killed (lightweight). No source or test mutations remain.

## Gate Check

- `npm.cmd run test:unit` — **PASS:** 31 files, 152 tests.
- `npm.cmd run typecheck` — **PASS.**
- `npm.cmd run lint` — **PASS:** 0 errors, 144 warnings. Relevant feature warnings are unused `LogOut` (`account-screen.tsx:4`) and unused `animDir` parameters (`map-screen.tsx:6`, `schedule-screen.tsx:5`); none affects behavior.

## Summary

The prior Home map navigation, scanner offline/recovery, schedule, and gallery-entry gaps all have direct unit evidence. No genuine blocker remains in the authorized validation scope.
