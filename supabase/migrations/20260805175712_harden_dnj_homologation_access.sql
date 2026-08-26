-- The Next API is the only data access layer during homologation. Explicit
-- service_role policies make this intent visible to the RLS advisor while
-- anon/authenticated remain revoked by the previous migration.

create index experiences_space_idx on public.experiences (space_id);
create index participations_event_idx on public.participations (event_id);
create index participations_qr_code_idx on public.participations (qr_code_id);
create index media_objects_owner_idx on public.media_objects (owner_user_id);
create index moderation_decisions_moderator_idx on public.moderation_decisions (moderator_user_id);
create index point_entries_participation_idx on public.point_entries (participation_id);
create index queues_space_idx on public.queues (space_id);
create index queue_entries_user_idx on public.queue_entries (user_id);
create index special_events_experience_idx on public.special_events (experience_id);
create index special_events_created_by_idx on public.special_events (created_by);
create index special_event_deliveries_user_idx on public.special_event_deliveries (user_id);
create index activity_runs_started_by_idx on public.activity_runs (started_by);
create index activity_run_participants_user_idx on public.activity_run_participants (user_id);
create index operation_events_event_idx on public.operation_events (event_id);
create index operation_events_experience_idx on public.operation_events (experience_id);

insert into storage.buckets (id, name, public)
values ('dnj-moments', 'dnj-moments', false)
on conflict (id) do update set public = excluded.public;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'test_users', 'gallery_posts', 'gallery_likes', 'gallery_comments',
    'operation_events', 'push_subscriptions', 'notification_campaigns',
    'groups', 'events', 'spaces', 'experiences', 'experience_manager_assignments',
    'qr_codes', 'participations', 'media_objects', 'moments', 'moment_likes',
    'moderation_decisions', 'point_entries', 'queues', 'queue_entries',
    'special_events', 'special_event_deliveries', 'activity_runs',
    'activity_run_participants'
  ] loop
    execute format('drop policy if exists dnj_server_only on public.%I', table_name);
    execute format('create policy dnj_server_only on public.%I for all to service_role using (true) with check (true)', table_name);
  end loop;
end;
$$;

drop policy if exists dnj_server_only on storage.objects;
create policy dnj_server_only on storage.objects
  for all to service_role
  using (bucket_id = 'dnj-moments')
  with check (bucket_id = 'dnj-moments');

alter function public.alo_increment_tentativas(uuid) set search_path = pg_catalog, public;
alter function public.alo_mark_success(uuid) set search_path = pg_catalog, public;
alter function public.alo_mark_failure(uuid, text) set search_path = pg_catalog, public;
