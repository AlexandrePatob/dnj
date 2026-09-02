# Unified Notifications Specification

**Status:** Implementation consolidated — pending environment provisioning and live homologation

## Problem Statement

The DNJ currently combines in-app polling, queue realtime updates and an incomplete VAPID path. The result is inconsistent delivery, misleading operational copy and no reliable notification when the app is in the background. Notification rules must be owned by the V2 backend while the frontend manages browser permission, the device subscription and local presentation.

## Goals

- [ ] Deliver important event updates consistently in-app and, when permitted, by Web Push.
- [ ] Keep the V2 backend as the authoritative source for categories, eligibility, preferences, persistence and delivery decisions.
- [ ] Preserve current polling and Firestore queue behavior as safe fallbacks during rollout.
- [ ] Keep polling as frontend state synchronization for participant and manager game flows, independently from push delivery.
- [ ] Give each point-history category a meaningful visual icon.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Push for normal points, check-ins, participations, photo submission or photo approval | These are intentionally non-interruptive events. |
| SMS, WhatsApp or e-mail delivery | Separate communication channels and provider contracts. |
| Replacing Firestore queue realtime | It remains the live queue source; the notification engine consumes its relevant state transition. |
| Native mobile applications | Scope is browser and installed PWA only. |

## Assumptions & Open Questions

| Decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- |
| Authority | V2 backend owns event policy, records, preferences and push dispatch; frontend owns permission and device subscription UX. | Prevents client-side rules from drifting or being bypassed. | Yes |
| Permission timing | Show an explanatory opt-in after login/onboarding; invoke the browser prompt only from the participant's explicit action. | Increases informed consent and avoids an early browser denial. | Yes |
| Essential queue alert | The queue "your turn" alert ignores ordinary notification-category preferences, but still requires browser/OS permission. | It is operationally time-sensitive. | Yes |
| Moderation alerts | Notify only rejection, deletion or point reversal; do not notify submission or approval. | Only exceptional outcomes interrupt the participant. | Yes |
| Deep links | Queue → queue; special event/challenge → Game; Admin → notification center/home; moderation → My Moments. | Confirmed participant navigation. | Yes |
| Vibration | Only queue call and Admin messages explicitly marked urgent may request vibration. | Limits interruption. | Yes |
| Browser capability failure | Keep the persisted in-app record and existing live fallback; do not block the underlying event. | Web Push is progressive enhancement. | Yes |
| Polling boundary | Polling remains for special events, game/runs and Moment Challenges so participant and manager UI can reconcile state; it does not itself imply a push notification. | UI state and participant interruption have different purposes. | Yes |

**Open questions:** none for the specified scope.

## User Stories

### P1: Important participant alert

**User Story:** As a participant, I want to receive an important DNJ alert even when the PWA is not open so that I do not miss my queue call, a challenge, a special event or an urgent notice.

**Acceptance Criteria:**

1. WHEN an eligible queue call, special event, Moment Challenge or Admin message occurs THEN the V2 backend SHALL create a category-specific notification record and decide its channels.
2. WHEN the participant has granted browser permission and owns an active subscription THEN the backend SHALL send a Web Push with a safe title, body, deep-link target and permitted vibration pattern.
3. WHEN push is unavailable, denied or delivery fails THEN the underlying DNJ event SHALL remain successful and the participant SHALL retain its in-app/live fallback.
4. WHEN a participant opens a delivered notification THEN the PWA SHALL navigate to the category's approved destination.

**Independent Test:** Trigger each eligible event for a subscribed test participant and verify its persisted record, push payload and deep-link; repeat with permission denied and confirm the fallback remains usable.

### P1: Informed notification opt-in

**User Story:** As a participant, I want a clear explanation before enabling notifications so that I can make an informed choice.

**Acceptance Criteria:**

1. WHEN an authenticated, onboarded participant has not answered the opt-in THEN the app SHALL present a non-blocking explanation of the important alert categories.
2. WHEN the participant chooses to enable alerts THEN the frontend SHALL request browser permission, register the service worker subscription and send it to the V2 backend.
3. WHEN permission is denied, unsupported or a subscription request fails THEN the app SHALL explain the non-fatal result and SHALL not repeatedly prompt without a new participant action.
4. WHEN the participant later changes the choice THEN the app SHALL offer a clear way to manage the subscription and notification preferences.

**Independent Test:** Test granted, denied, unsupported and failed subscription states without relying on a live push provider.

### P1: Exception-only Moment moderation

**User Story:** As a participant, I want to be alerted only when my Moment needs attention so that routine actions do not create noise.

**Acceptance Criteria:**

1. WHEN a Moment is rejected, deleted or has its points reversed THEN the backend SHALL create a moderation notification and may dispatch push when the device supports it.
2. WHEN a Moment is submitted or approved THEN the backend SHALL not create or dispatch a notification.
3. WHEN the participant opens the moderation alert THEN the PWA SHALL open My Moments.

**Independent Test:** Execute each moderation transition and assert both the positive and suppressed-notification cases.

### P1: Reliable existing live notices

**User Story:** As a participant using the app, I want the current live notices to remain available while push is being introduced so that no operational flow regresses.

**Acceptance Criteria:**

1. WHEN rollout is incomplete or push is unavailable THEN the existing special-event, Moment Challenge, Admin and queue presentations SHALL continue to work.
2. WHEN an in-app notification and its matching push refer to the same event THEN the client SHALL avoid presenting duplicate interruptive alerts.
3. WHEN the queue call occurs while the user is outside the queue screen THEN the notification engine SHALL still be able to notify the subscribed participant.
4. WHEN participant or manager game state is polled THEN the frontend SHALL reconcile the current activity/run state without treating each poll result as a notification.

**Independent Test:** Run current polling/realtime tests plus a duplicate-event scenario and verify one participant-facing alert per event.

### P2: Clear history icons

**User Story:** As a participant, I want each history entry to have an appropriate icon so that I can identify its origin at a glance.

**Acceptance Criteria:**

1. WHEN the Game overview returns `trophy`, `medal`, `game`, `camera`, `shield` or `points` THEN the History UI SHALL render its corresponding intentional icon rather than the generic fallback.
2. WHEN an unknown icon is received THEN the UI SHALL render a safe generic points icon.

**Independent Test:** Render every supported icon token and an unknown token in the History component.

## Edge Cases

- WHEN a push subscription becomes invalid THEN the backend SHALL deactivate it and SHALL not retry it indefinitely.
- WHEN the same domain event is retried THEN the backend SHALL not create duplicate notification records or duplicate pushes for the same recipient and event.
- WHEN an Admin message is ordinary THEN it SHALL not request vibration; only an explicitly urgent message may do so.
- WHEN browser notifications are unavailable on the device THEN the app SHALL not expose a broken opt-in control.
- WHEN a push payload is malformed or absent THEN the service worker SHALL display a safe fallback without exposing sensitive data.

## Requirement Traceability

| Requirement ID | Story | Status |
| --- | --- | --- |
| NOTIF-01 | Important participant alert | Implemented; live delivery pending provisioning |
| NOTIF-02 | Informed notification opt-in | Implemented |
| NOTIF-03 | Exception-only Moment moderation | Implemented |
| NOTIF-04 | Reliable existing live notices | Implemented |
| NOTIF-05 | Clear history icons | Implemented |
| NOTIF-06 | Idempotency, invalid subscriptions and observability | Implemented; worker scheduling pending |

## Success Criteria

- [x] Every approved notification category has one documented backend policy and one verified fallback.
- [ ] A subscribed participant receives the queue-call push while the PWA is backgrounded or closed (requires deployed VAPID worker).
- [x] Routine actions do not create a notification record or push.
- [x] Existing live surfaces continue to work throughout the rollout.
