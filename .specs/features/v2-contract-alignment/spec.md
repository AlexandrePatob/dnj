# V2 Contract Alignment Specification

## Goal

Make every existing V2 client call conform to the published V2 OpenAPI 2.7.0 contract without changing backend behavior.

## Acceptance Criteria

- **V2C-01** WHEN a V2 session refreshes THEN the client SHALL read `csrf_token` and send it as `X-CSRF-Token`.
- **V2C-02** WHEN onboarding, groups, activities, favorites, notifications, game reads, Moments, or media are used THEN the client SHALL use the published method, path, query parameters, body fields, and response envelope.
- **V2C-03** WHEN a manager operates a game THEN the UI SHALL use only published `/manager/*` operations; unsupported manager capabilities SHALL not issue nonexistent requests.
- **V2C-04** WHEN an admin lists staff THEN the request SHALL include `role=EVENT_MANAGER`.
- **V2C-05** WHEN the adapters are changed THEN focused unit tests SHALL assert the emitted request contracts and the project typecheck/lint/unit suite SHALL pass.

## Scope

Existing frontend calls only. No backend changes, no OpenAPI changes, and no new product capabilities.

## Assumptions

- The live OpenAPI URL supplied by the user is authoritative.
- Manager space and special-event operations have no V2 equivalent and will be removed from the V2-facing dashboard rather than emulated.
- QR images are generated locally from the published `qrToken` using the already-installed `qrcode` package.
