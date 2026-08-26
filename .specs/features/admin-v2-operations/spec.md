# Admin V2 Operations

## Objective

Connect the existing Admin dashboard to the documented legacy V2 operations API while preserving the established local session flow.

## Acceptance criteria

- AC-1: Admin session calls remain on `/api/admin/session` and are not changed by this migration.
- AC-2: Dashboard data calls use `/api/v2` so Next forwards them to the configured V2 upstream.
- AC-3: Staff, activities, spaces, moderation, and notifications use only documented V2 operation routes and response envelopes.
- AC-4: Navigation excludes dashboard sections without a documented legacy V2 equivalent.
- AC-5: A moderation action sends only the documented `action` payload to the moment-specific endpoint.
- AC-6: A notification sends `title` and `body` and reports the returned aggregate recipient count.
