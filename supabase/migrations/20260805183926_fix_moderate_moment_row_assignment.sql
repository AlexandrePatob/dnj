-- Keep the deployed RPC aligned with the corrected base migration.
create or replace function public.moderate_moment(
  p_moment_id uuid,
  p_decision text,
  p_reason text default null,
  p_moderator_user_id uuid default null
)
returns table (moment_id uuid, storage_key text, photo_deleted boolean)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_moment public.moments%rowtype;
  v_storage_key text;
  v_user_id uuid;
  v_delta integer;
begin
  if p_decision not in ('approved', 'deny_points', 'delete_photo') then
    raise exception 'invalid moderation decision';
  end if;

  select m.* into v_moment
  from public.moments m
  where m.id = p_moment_id
  for update;

  if not found then
    raise exception 'moment not found';
  end if;

  select mo.storage_key, p.user_id
    into v_storage_key, v_user_id
  from public.media_objects mo
  join public.participations p on p.id = v_moment.participation_id
  where mo.id = v_moment.media_object_id
  for update of mo;

  if p_decision = 'approved' then
    if v_moment.photo_status = 'deleted' then
      raise exception 'deleted photo cannot be approved';
    end if;

    update public.moments
      set moderation_status = 'approved', publication_status = 'public', reward_status = 'awarded', removal_reason = null, removed_at = null
      where id = p_moment_id;

    if v_moment.reward_status <> 'awarded' and v_moment.points_awarded > 0 then
      insert into public.point_entries (user_id, participation_id, reason, delta, idempotency_key)
        values (v_user_id, v_moment.participation_id, 'moment_award', v_moment.points_awarded, md5(p_moment_id::text || ':award')::uuid)
        on conflict (idempotency_key) do nothing
        returning delta into v_delta;
      if found then update public.test_users set points = points + v_delta where id = v_user_id; end if;
    end if;
  else
    update public.moments
      set moderation_status = 'rejected', publication_status = 'private', reward_status = 'denied', removal_reason = p_reason, removed_at = now(),
          photo_status = case when p_decision = 'delete_photo' then 'deleted' else photo_status end
      where id = p_moment_id;

    if v_moment.reward_status = 'awarded' and v_moment.points_awarded > 0 then
      insert into public.point_entries (user_id, participation_id, reason, delta, idempotency_key)
        values (v_user_id, v_moment.participation_id, 'moment_reversal', -v_moment.points_awarded, md5(p_moment_id::text || ':reversal')::uuid)
        on conflict (idempotency_key) do nothing
        returning delta into v_delta;
      if found then update public.test_users set points = points + v_delta where id = v_user_id; end if;
    end if;

    if p_decision = 'delete_photo' then
      update public.media_objects set deleted_at = now() where id = v_moment.media_object_id;
    end if;
  end if;

  insert into public.moderation_decisions (moment_id, moderator_user_id, decision, reason)
    values (p_moment_id, p_moderator_user_id, p_decision, p_reason);

  return query select p_moment_id, v_storage_key, p_decision = 'delete_photo';
end;
$$;

revoke all on function public.moderate_moment(uuid, text, text, uuid) from public;
grant execute on function public.moderate_moment(uuid, text, text, uuid) to service_role;
