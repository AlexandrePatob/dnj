alter table public.special_events drop constraint if exists special_events_delivery_targets_check;
alter table public.special_events add constraint special_events_delivery_targets_check check (cardinality(delivery_targets) > 0 and delivery_targets <@ array['app','tv','screen']::text[]);
