# DNJ 2K26 — Execution Tasks

**Status:** Implemented — visual-baseline approval pending  
**Execution exception approved by user:** testes serão escritos com as mudanças, mas `typecheck`, lint, build e as suítes só serão executados após a última tarefa.

## Test Coverage Matrix

> Guidelines found: `vitest.config.ts`, `playwright.config.ts`; co-local React tests use `src/**/*.test.tsx`, domain/mock tests use `src/**/*.test.ts`, and visual coverage uses Playwright.

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
| --- | --- | --- | --- | --- |
| React screens/components | unit | happy path, required states, reduced-motion/role visibility where relevant | `src/**/*.test.tsx` | `npm run test:unit` |
| Mock domain/repositories/routes | unit | 1:1 AC + error/idempotency edges | `src/**/*.test.ts` | `npm run test:unit` |
| Participant journey | e2e/visual | QR, Moments and responsive visual smoke | `tests/e2e/**`, `tests/visual/**` | `npm run test:e2e`, `npm run test:visual` |

## Gate Check Commands

| Gate Level | Command |
| --- | --- |
| Quick | `npm run test:unit` |
| Full | `npm run test:unit && npm run test:e2e` |
| Build | `npm run validate` |

## Execution Plan

```
Phase 1 — T1 Brand foundation → T2 Moments → T3 QR feedback → T4 onboarding/live shell
Phase 2 — T5 Experience contracts → T6 manager mock/UI → T7 admin operation/UI
Phase 3 — T8 test reconciliation → T9 final validation
```

| Task | Requirement | Deliverable | Tests | Gate |
| --- | --- | --- | --- | --- |
| T1 | HOM-05..07 | Space Grotesk, sticker asset/component and participant chrome | unit | final |
| T2 | MOM-01..08 | Feed, passaporte, group scope, watermark and no comments | unit | final |
| T3 | ENG-01..07 | QR capability controls and success celebration | unit | final |
| T4 | HOM-01..04, LIV-01..04 | First-access tutorial, home now card and live-status stack | unit | final |
| T5 | ENG-01..06 | Portable experience contracts and shared mock state | unit | final |
| T6 | MGR-01..05 | Manager route, authorization and activity controls | unit | final |
| T7 | ADM-01..05 | Admin special-event and moderation actions | unit | final |
| T8 | all UI | Update/add focused unit tests without weakening existing assertions | unit | final |
| T9 | all | Typecheck, lint, unit, build and applicable e2e/visual tests; fix failures | full/build | final |

## Task Granularity Check

All tasks are phase-sized implementation units because the user explicitly authorized an end-to-end integrated delivery with final-only gates. Tests remain co-located with their changed layer.

## Final Validation Record — 2026-08-05

- `npm run typecheck`: passed.
- `npm run lint`: passed with existing warnings outside this feature.
- `npm run test:unit`: passed — 36 files, 160 tests.
- `npm run build`: passed.
- Playwright Chromium: passed — 15 tests.
- Playwright WebKit: passed — 4 tests.
- Visual baselines: navigation is stable; snapshots intentionally differ because the approved redesign changes logo, typography and participant chrome. Baselines were not updated automatically and await product visual approval.
