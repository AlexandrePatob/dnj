-- Scope youth groups to their DNJ event and protect check-in + points with one transaction.

alter table public.groups add column if not exists event_id uuid references public.events(id) on delete cascade;

update public.groups
set event_id = (select id from public.events where slug = 'dnj-2k26-curitiba')
where event_id is null;

alter table public.groups alter column event_id set not null;
alter table public.groups drop constraint if exists groups_name_key;
alter table public.groups add constraint groups_event_name_key unique (event_id, name);
create index if not exists groups_event_idx on public.groups (event_id, name);

create or replace function public.validate_dnj_qr(
  p_user_id uuid,
  p_token_hash text,
  p_idempotency_key uuid,
  p_now timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_qr public.qr_codes%rowtype;
  v_experience public.experiences%rowtype;
  v_event public.events%rowtype;
  v_participation public.participations%rowtype;
  v_points integer;
  v_total integer;
  v_can_share boolean;
begin
  select qr.* into v_qr from public.qr_codes qr where qr.token_hash = p_token_hash for update;
  if not found or v_qr.status <> 'active' then return jsonb_build_object('ok', false, 'code', 'QR_INVALID'); end if;
  if v_qr.expiration_time < p_now then return jsonb_build_object('ok', false, 'code', 'QR_EXPIRED'); end if;
  if v_qr.max_uses is not null and v_qr.used_count >= v_qr.max_uses then return jsonb_build_object('ok', false, 'code', 'QR_LIMIT_REACHED'); end if;

  select * into v_experience from public.experiences where id = v_qr.experience_id;
  select * into v_event from public.events where id = v_experience.event_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'QR_INVALID'); end if;
  select points into v_total from public.test_users where id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED'); end if;

  select * into v_participation from public.participations where user_id = p_user_id and experience_id = v_experience.id and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('ok', true, 'created', false, 'newTotalPoints', v_total, 'participation', jsonb_build_object('id', v_participation.id, 'event', jsonb_build_object('id', v_event.id, 'name', v_event.name), 'activity', jsonb_build_object('id', v_experience.id, 'name', v_experience.name), 'place', coalesce((select jsonb_build_object('id', s.id, 'name', s.name) from public.spaces s where s.id = v_experience.space_id), jsonb_build_object('id', '', 'name', 'Espaço DNJ')), 'checkedInAt', v_participation.checked_in_at, 'cooldownEndsAt', v_participation.cooldown_ends_at, 'status', v_participation.status, 'canShareMoment', v_participation.can_share_moment, 'checkInPoints', v_participation.check_in_points)); end if;
  if exists (select 1 from public.participations where user_id = p_user_id and experience_id = v_experience.id and cooldown_ends_at > p_now) then return jsonb_build_object('ok', false, 'code', 'COOLDOWN_ACTIVE'); end if;

  v_can_share := v_experience.allows_moment and (v_qr.expiration_momento_time is null or v_qr.expiration_momento_time >= p_now);
  insert into public.participations (user_id, event_id, experience_id, qr_code_id, checked_in_at, cooldown_ends_at, can_share_moment, check_in_points, idempotency_key)
  values (p_user_id, v_experience.event_id, v_experience.id, v_qr.id, p_now, p_now + make_interval(secs => v_experience.cooldown_seconds), v_can_share, v_experience.check_in_points, p_idempotency_key)
  returning * into v_participation;
  v_points := v_experience.check_in_points;
  v_total := v_total + v_points;
  if v_points <> 0 then
    insert into public.point_entries (user_id, participation_id, reason, delta, idempotency_key) values (p_user_id, v_participation.id, 'qr_checkin', v_points, p_idempotency_key);
    update public.test_users set points = v_total, last_seen_at = p_now where id = p_user_id;
  end if;
  update public.qr_codes set used_count = used_count + 1 where id = v_qr.id;
  return jsonb_build_object('ok', true, 'created', true, 'newTotalPoints', v_total, 'participation', jsonb_build_object('id', v_participation.id, 'event', jsonb_build_object('id', v_event.id, 'name', v_event.name), 'activity', jsonb_build_object('id', v_experience.id, 'name', v_experience.name), 'place', coalesce((select jsonb_build_object('id', s.id, 'name', s.name) from public.spaces s where s.id = v_experience.space_id), jsonb_build_object('id', '', 'name', 'Espaço DNJ')), 'checkedInAt', v_participation.checked_in_at, 'cooldownEndsAt', v_participation.cooldown_ends_at, 'status', v_participation.status, 'canShareMoment', v_participation.can_share_moment, 'checkInPoints', v_participation.check_in_points));
end;
$$;

revoke all on function public.validate_dnj_qr(uuid, text, uuid, timestamptz) from public;
grant execute on function public.validate_dnj_qr(uuid, text, uuid, timestamptz) to service_role;
