# Unified Notifications Context

**Gathered:** 2026-08-30
**Spec:** `.specs/features/unified-notifications/spec.md`
**Status:** Ready for technical design

## Feature Boundary

Unify DNJ browser/PWA notifications under V2 backend policy while retaining the existing in-app and queue realtime flows as fallbacks. The feature includes participant opt-in, Web Push subscription, approved event categories, deep links, vibration rules and history-icon correction.

## Implementation Decisions

### Ownership

- Backend V2 decides category, recipient, preferences, persistence, deduplication and push delivery.
- Frontend requests browser permission only after informed participant action, creates/removes the device subscription and renders local UX.
- Polling stays in the frontend for state reconciliation; it asks the V2 API what is current but never decides by itself whether to interrupt a participant.

### Participant-facing categories

- Push/in-app eligible: queue call, special event, Moment Challenge and Admin announcement.
- Moderation eligible only for rejection, deletion or point reversal.
- Suppressed: photo submission, photo approval, normal points, check-in and participation.

### Polling and manager operations

- Special Event, Moment Challenge and game/run polling remain active for participant UI control.
- Manager game/run updates remain state-driven and are not participant push notifications by default.

### Essential and urgent alerts

- Queue call is essential after browser permission and is not silenced by ordinary category preferences.
- Vibration is limited to queue call and Admin messages explicitly marked urgent.

### Notification destinations

- Queue → Queue screen.
- Special Event and Moment Challenge → DNJ Game.
- Admin → notification center/home.
- Moderation → My Moments.

## Specific References

- Participant wants concise, important alerts rather than a notification for every action.
- Existing polling must remain functional while the unified engine is rolled out.

## Deferred Ideas

- SMS, WhatsApp, email and native mobile delivery.
