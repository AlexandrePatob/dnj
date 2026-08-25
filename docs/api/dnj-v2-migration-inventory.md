# DNJ V2 migration inventory

This inventory is the rollback boundary for the participant migration. No legacy route is removed by this frontend change.

| Route family | Owner | Status | V2 replacement / decision | Removal gate |
| --- | --- | --- | --- | --- |
| `/api/v1/auth/*` | Participant frontend + legacy Next handlers | Retained rollback | V2 `auth/google`, `auth/session`, `auth/refresh`, `auth/onboarding`, `auth/logout`; UI still contains legacy code path pending T6/T1 integration evidence | Zero production traffic on V1 auth for one release, verified by server metrics and successful V2 session bootstrap |
| `/api/v1/users/*`, `/groups`, `/schedule`, `/spaces` | Participant frontend | Retained rollback | V2 group/activity adapters (`groups.ts`, `activities.ts`) | Production V1 traffic below agreed threshold and E2E/full gate green |
| `/api/v1/game/*`, `/qr/*`, `/participations/*` | Participant frontend | Retained rollback | V2 game/QR adapters; Game and scanner coverage remains partial (T10/T11) | T10/T11 complete, E2E happy/empty/error/retry evidence, then production traffic gate |
| `/api/v1/moments/*`, `/media/*`, `/gallery/*` | Participant frontend | Retained rollback | V2 media/moments adapters; composer/gallery coverage remains partial (T13/T15) | Upload retry and gallery cursor E2E evidence plus production traffic gate |
| `/api/admin/*` | Admin frontend / Next route handlers | Retained | No confirmed participant V2 equivalent; operational ownership remains in Next/Supabase | Separate operations migration decision and traffic evidence |
| `/api/manager/*` | Manager frontend / Next route handlers | Retained | No confirmed participant V2 equivalent; operational ownership remains in Next/Supabase | Separate operations migration decision and traffic evidence |
| `/api/push/*` | Participant account + Next push handlers | Retained and excluded | VAPID public-key/subscription flow has no confirmed V2 equivalent | Must not be removed as part of participant V2 migration |
| `/api/display/*` | Display/telão frontend + Next handler | Retained and excluded | Display/telão is explicitly out of scope | Must not be removed as part of participant V2 migration |

## Evidence and rollback

- V2 transport/session evidence: T1–T6 quick/build gates and `src/lib/api/auth.ts`.
- V2 participant adapters: T7–T9 and T12/T14 focused unit gates.
- Optional profile, notifications and favorites adapters: T16–T18 focused unit gates. Their endpoint paths are provisional because the published handoff does not define these P2 routes.
- PWA safety: T19 unit coverage passed (31 tests); the full validation gate is blocked by pre-existing lint errors.
- Browser migration: T20 build passed, but the route-mocked journey is blocked by the current `/v2` rewrite/upstream setup and incomplete T10/T11/T13/T15 coverage.

Removal requires all of: a confirmed V2 replacement, happy/empty/error/retry evidence where applicable, server traffic metrics showing no meaningful legacy use, a documented rollback switch, and an explicit backend/operations approval. Until then, legacy handlers remain deployable.
