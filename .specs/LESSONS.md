# LESSONS — auto-maintained by scripts/lessons.py

> Machine-owned. Do NOT hand-edit. Changes are overwritten on the next `lessons.py` write.
> Canonical state lives in `.specs/lessons.json`. Edit lessons only via the script.
> promote_threshold=2 distinct features · window_days=45 · quarantine_threshold=2

## Confirmed (load these at Specify/Design)

Corroborated across multiple features. Safe to apply as guidance.

_none_

## Candidates (under observation — do NOT load as guidance yet)

Seen once or not yet corroborated. Tracked, not trusted.

### L-001 — Guard terminal client lifecycle states in memory when persistent storage is optional
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `pwa` · harmful: 0
- features: pwa-install-promotion
- evidence: PWAIP-03,PWAIP-04 (pwa)
- last seen: 2026-07-22T22:04:01Z

### L-002 — Assert each user action persistence side effect directly instead of relying on an equivalent platform path
- signal: `ac_gap` · recurrence: 1 feature(s) · scope: `pwa` · harmful: 0
- features: pwa-install-promotion
- evidence: PWAIP-04 (pwa)
- last seen: 2026-07-22T22:04:02Z

## Quarantined (failed when applied — ignore)

A confirmed lesson that recurred alongside failure. Kept for the maintainer to review.

_none_
