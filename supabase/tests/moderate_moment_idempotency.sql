-- Integration regression test for public.moderate_moment.
-- Run with a privileged database connection. It creates and removes its own data.
do $test$
declare
  v_user_id uuid;
  v_event_id uuid;
  v_experience_id uuid;
  v_participation_id uuid;
  v_media_id uuid;
  v_moment_id uuid;
  v_entry_count integer;
  v_points integer;
begin
  insert into public.test_users (external_key, display_name)
    values ('moderation-idempotency-' || gen_random_uuid()::text, 'Moderation integration test')
    returning id into v_user_id;

  insert into public.events (slug, name, starts_at, ends_at, status)
    values ('moderation-idempotency-' || gen_random_uuid()::text, 'Moderation integration test', now(), now() + interval '1 hour', 'active')
    returning id into v_event_id;

  insert into public.experiences (event_id, slug, name, kind, status, moment_points)
    values (v_event_id, 'moment-test', 'Moment test', 'moment_challenge', 'active', 17)
    returning id into v_experience_id;

  insert into public.participations (user_id, event_id, experience_id, cooldown_ends_at, idempotency_key)
    values (v_user_id, v_event_id, v_experience_id, now(), gen_random_uuid())
    returning id into v_participation_id;

  insert into public.media_objects (owner_user_id, storage_key, content_type, bytes)
    values (v_user_id, 'tests/moderation/' || gen_random_uuid()::text || '.jpg', 'image/jpeg', 1)
    returning id into v_media_id;

  insert into public.moments (participation_id, media_object_id, points_awarded, idempotency_key)
    values (v_participation_id, v_media_id, 17, gen_random_uuid())
    returning id into v_moment_id;

  perform public.moderate_moment(v_moment_id, 'approved');
  perform public.moderate_moment(v_moment_id, 'approved');

  select count(*) into v_entry_count
  from public.point_entries
  where participation_id = v_participation_id and reason = 'moment_award';

  select points into v_points from public.test_users where id = v_user_id;

  if v_entry_count <> 1 or v_points <> 17 then
    raise exception 'moderate_moment must award exactly once; entries=%, points=%', v_entry_count, v_points;
  end if;

  delete from public.point_entries where participation_id = v_participation_id;
  delete from public.events where id = v_event_id;
  delete from public.test_users where id = v_user_id;
end;
$test$;
