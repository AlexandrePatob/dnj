# V2 Contract Alignment Tasks

## Test Coverage Matrix

| Code layer | Required test type | Location | Command |
| --- | --- | --- | --- |
| API adapters | unit | `src/lib/api/*.test.ts` | `npm run test:unit` |
| React manager/admin | unit | `src/components/**/*.test.tsx` | `npm run test:unit` |

## Gate Check Commands

| Gate | Command |
| --- | --- |
| Quick | `npm run test:unit -- --project node` |
| Build | `npm run typecheck && npm run lint && npm run test:unit` |

## Execution Plan

1. **T1 Client/auth contract** — CSRF cookie and onboarding method/response; tests; V2C-01/02.
2. **T2 Participant collection adapters** — activities, groups, favorites, notifications; tests; V2C-02.
3. **T3 Game and Moment adapters** — response envelopes, like route, media asset ID; tests; V2C-02.
4. **T4 Admin contract** — mandatory staff role query; tests; V2C-04.
5. **T5 Manager V2 operations** — replace unpublished calls with `/manager/*`, generate QR image from token, omit unsupported consoles; tests; V2C-03.
6. **T6 Consumer alignment** — update screens/types for normalized adapter results; tests; V2C-02.
7. **T7 Final verification** — typecheck, lint, unit tests; V2C-05.
