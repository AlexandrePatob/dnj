-- Persisted operational access and actions for DNJ managers.
-- Homologation accounts: gestor.espaco@dnj.local, gestor.radicalidade@dnj.local
-- and gestor.especial@dnj.local use the password dnj2026.

alter table public.test_users add column if not exists password_hash text;

create table public.manager_scopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.test_users(id) on delete cascade,
  scope text not null check (scope in ('space_timer', 'radicality', 'special_events')),
  space_id uuid references public.spaces(id) on delete cascade,
  created_at timestamptz not null default now(),
  check ((scope = 'space_timer' and space_id is not null) or (scope <> 'space_timer' and space_id is null))
);

alter table public.experiences
  add column if not exists actual_started_at timestamptz,
  add column if not exists actual_ended_at timestamptz,
  add column if not exists flex_minutes integer not null default 0 check (flex_minutes >= 0);

alter table public.activity_runs
  add column if not exists point_rules jsonb not null default '{"first":120,"second":90,"third":70,"participation":30}'::jsonb;
alter table public.activity_runs drop constraint if exists activity_runs_status_check;
alter table public.activity_runs add constraint activity_runs_status_check check (status in ('draft', 'active', 'paused', 'results', 'completed', 'cancelled'));

alter table public.special_events add column if not exists teaser_started_at timestamptz;
alter table public.qr_codes
  add column if not exists activity_run_id uuid references public.activity_runs(id) on delete cascade,
  add column if not exists special_event_id uuid references public.special_events(id) on delete cascade,
  add constraint qr_codes_one_operation_check check (not (activity_run_id is not null and special_event_id is not null));

create index if not exists manager_scopes_user_idx on public.manager_scopes(user_id, scope);
create index if not exists manager_scopes_space_idx on public.manager_scopes(space_id) where space_id is not null;
create unique index if not exists manager_scopes_unique_idx on public.manager_scopes(user_id, scope, coalesce(space_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists qr_codes_activity_run_idx on public.qr_codes(activity_run_id) where activity_run_id is not null;
create index if not exists qr_codes_special_event_idx on public.qr_codes(special_event_id) where special_event_id is not null;

alter table public.manager_scopes enable row level security;
revoke all on public.manager_scopes from anon, authenticated;
grant all on public.manager_scopes to service_role;

create or replace function public.dnj_operator_login(p_email text, p_password text)
returns table (user_id uuid, display_name text, scopes text[])
language sql
security invoker
set search_path = pg_catalog, public
as $$
  select u.id, u.display_name, array_agg(ms.scope order by ms.scope)
  from public.test_users u
  join public.manager_scopes ms on ms.user_id = u.id
  where lower(u.email) = lower(trim(p_email))
    and u.is_active
    and u.password_hash is not null
    and extensions.crypt(p_password, u.password_hash) = u.password_hash
  group by u.id, u.display_name;
$$;

revoke all on function public.dnj_operator_login(text, text) from public;
grant execute on function public.dnj_operator_login(text, text) to service_role;

create or replace function public.dnj_finalize_activity_run(p_manager_id uuid, p_run_id uuid, p_placements jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_run public.activity_runs%rowtype;
  v_rule_first integer;
  v_rule_second integer;
  v_rule_third integer;
  v_rule_participation integer;
  v_awarded integer := 0;
begin
  if not exists (select 1 from public.manager_scopes where user_id = p_manager_id and scope = 'radicality') then
    return jsonb_build_object('ok', false, 'code', 'FORBIDDEN');
  end if;
  select * into v_run from public.activity_runs where id = p_run_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if v_run.status = 'completed' then return jsonb_build_object('ok', true, 'alreadyFinalized', true, 'awarded', 0); end if;
  if v_run.status not in ('active', 'paused', 'results') then return jsonb_build_object('ok', false, 'code', 'RUN_NOT_ACTIVE'); end if;
  v_rule_first := coalesce((v_run.point_rules ->> 'first')::integer, 120);
  v_rule_second := coalesce((v_run.point_rules ->> 'second')::integer, 90);
  v_rule_third := coalesce((v_run.point_rules ->> 'third')::integer, 70);
  v_rule_participation := coalesce((v_run.point_rules ->> 'participation')::integer, 30);

  with requested as (
    select (value ->> 'userId')::uuid as user_id, min(nullif(value ->> 'placement', '')::integer) as placement
    from jsonb_array_elements(coalesce(p_placements, '[]'::jsonb))
    group by (value ->> 'userId')::uuid
  ), eligible as (
    select rp.user_id, rp.placement,
      case rp.placement when 1 then v_rule_first when 2 then v_rule_second when 3 then v_rule_third else v_rule_participation end as points
    from requested rp join public.activity_run_participants arp on arp.activity_run_id = p_run_id and arp.user_id = rp.user_id
  ), entries as (
    insert into public.point_entries(user_id, reason, delta, idempotency_key)
    select user_id, 'radicality_run', points, md5(p_run_id::text || ':' || user_id::text)::uuid from eligible
    on conflict (idempotency_key) do nothing
    returning user_id, delta
  ), updated as (
    update public.test_users u set points = u.points + e.delta, updated_at = now()
    from entries e where u.id = e.user_id returning e.user_id, e.delta
  )
  select coalesce(sum(delta), 0) into v_awarded from updated;

  update public.activity_run_participants arp
    set placement = req.placement,
        points_awarded = case req.placement when 1 then v_rule_first when 2 then v_rule_second when 3 then v_rule_third else v_rule_participation end,
        status = 'awarded'
  from (
    select (value ->> 'userId')::uuid as user_id, min(nullif(value ->> 'placement', '')::integer) as placement
    from jsonb_array_elements(coalesce(p_placements, '[]'::jsonb)) group by (value ->> 'userId')::uuid
  ) req
  where arp.activity_run_id = p_run_id and arp.user_id = req.user_id;

  update public.activity_runs set status = 'completed', ended_at = now() where id = p_run_id;
  return jsonb_build_object('ok', true, 'alreadyFinalized', false, 'awarded', v_awarded);
end;
$$;

revoke all on function public.dnj_finalize_activity_run(uuid, uuid, jsonb) from public;
grant execute on function public.dnj_finalize_activity_run(uuid, uuid, jsonb) to service_role;

create or replace function public.dnj_award_moment(p_moment_id uuid, p_user_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare v_moment public.moments%rowtype; v_total integer; v_delta integer;
begin
  select m.* into v_moment from public.moments m
    join public.participations p on p.id = m.participation_id
    where m.id = p_moment_id and p.user_id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'NOT_FOUND'); end if;
  if v_moment.reward_status = 'awarded' then
    select points into v_total from public.test_users where id = p_user_id;
    return jsonb_build_object('ok', true, 'awarded', false, 'newTotalPoints', v_total);
  end if;
  insert into public.point_entries(user_id, participation_id, reason, delta, idempotency_key)
    values (p_user_id, v_moment.participation_id, 'moment_award', v_moment.points_awarded, md5(p_moment_id::text || ':award')::uuid)
    on conflict (idempotency_key) do nothing returning delta into v_delta;
  update public.moments set reward_status = 'awarded' where id = p_moment_id;
  update public.test_users set points = points + coalesce(v_delta, 0), updated_at = now() where id = p_user_id returning points into v_total;
  return jsonb_build_object('ok', true, 'awarded', coalesce(v_delta, 0) > 0, 'newTotalPoints', v_total);
end;
$$;

revoke all on function public.dnj_award_moment(uuid, uuid) from public;
grant execute on function public.dnj_award_moment(uuid, uuid) to service_role;

create or replace function public.validate_dnj_qr(
  p_user_id uuid, p_token_hash text, p_idempotency_key uuid, p_now timestamptz default now()
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_qr public.qr_codes%rowtype; v_experience public.experiences%rowtype; v_event public.events%rowtype;
  v_participation public.participations%rowtype; v_points integer; v_total integer; v_can_share boolean; v_special public.special_events%rowtype;
begin
  select qr.* into v_qr from public.qr_codes qr where qr.token_hash = p_token_hash for update;
  if not found or v_qr.status <> 'active' then return jsonb_build_object('ok', false, 'code', 'QR_INVALID'); end if;
  if v_qr.expiration_time < p_now then return jsonb_build_object('ok', false, 'code', 'QR_EXPIRED'); end if;
  if v_qr.max_uses is not null and v_qr.used_count >= v_qr.max_uses then return jsonb_build_object('ok', false, 'code', 'QR_LIMIT_REACHED'); end if;
  if v_qr.special_event_id is not null then
    select * into v_special from public.special_events where id = v_qr.special_event_id;
    if not found or v_special.status not in ('teaser', 'active') or (v_special.status = 'teaser' and coalesce(v_special.teaser_started_at, p_now) + make_interval(secs => v_special.teaser_seconds) > p_now) then return jsonb_build_object('ok', false, 'code', 'QR_INVALID'); end if;
  end if;
  select * into v_experience from public.experiences where id = v_qr.experience_id;
  select * into v_event from public.events where id = v_experience.event_id;
  if not found then return jsonb_build_object('ok', false, 'code', 'QR_INVALID'); end if;
  select points into v_total from public.test_users where id = p_user_id for update;
  if not found then return jsonb_build_object('ok', false, 'code', 'UNAUTHENTICATED'); end if;
  select * into v_participation from public.participations where user_id = p_user_id and experience_id = v_experience.id and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('ok', true, 'created', false, 'newTotalPoints', v_total, 'participation', jsonb_build_object('id', v_participation.id, 'event', jsonb_build_object('id', v_event.id, 'name', v_event.name), 'activity', jsonb_build_object('id', v_experience.id, 'name', v_experience.name), 'place', coalesce((select jsonb_build_object('id', s.id, 'name', s.name) from public.spaces s where s.id = v_experience.space_id), jsonb_build_object('id', '', 'name', 'EspaÃ§o DNJ')), 'checkedInAt', v_participation.checked_in_at, 'cooldownEndsAt', v_participation.cooldown_ends_at, 'status', v_participation.status, 'canShareMoment', v_participation.can_share_moment, 'checkInPoints', v_participation.check_in_points)); end if;
  if exists (select 1 from public.participations where user_id = p_user_id and experience_id = v_experience.id and cooldown_ends_at > p_now) then return jsonb_build_object('ok', false, 'code', 'COOLDOWN_ACTIVE'); end if;
  v_can_share := v_qr.special_event_id is null and v_experience.allows_moment and (v_qr.expiration_momento_time is null or v_qr.expiration_momento_time >= p_now);
  insert into public.participations(user_id,event_id,experience_id,qr_code_id,checked_in_at,cooldown_ends_at,can_share_moment,check_in_points,idempotency_key)
    values (p_user_id,v_experience.event_id,v_experience.id,v_qr.id,p_now,p_now + make_interval(secs => v_experience.cooldown_seconds),v_can_share,v_experience.check_in_points,p_idempotency_key) returning * into v_participation;
  if v_qr.activity_run_id is not null then insert into public.activity_run_participants(activity_run_id,user_id) values(v_qr.activity_run_id,p_user_id) on conflict do nothing; end if;
  v_points := v_experience.check_in_points; v_total := v_total + v_points;
  if v_points <> 0 then insert into public.point_entries(user_id,participation_id,reason,delta,idempotency_key) values(p_user_id,v_participation.id,'qr_checkin',v_points,p_idempotency_key); update public.test_users set points=v_total,last_seen_at=p_now where id=p_user_id; end if;
  update public.qr_codes set used_count=used_count+1 where id=v_qr.id;
  return jsonb_build_object('ok', true, 'created', true, 'newTotalPoints', v_total, 'participation', jsonb_build_object('id', v_participation.id, 'event', jsonb_build_object('id', v_event.id, 'name', v_event.name), 'activity', jsonb_build_object('id', v_experience.id, 'name', v_experience.name), 'place', coalesce((select jsonb_build_object('id', s.id, 'name', s.name) from public.spaces s where s.id = v_experience.space_id), jsonb_build_object('id', '', 'name', 'EspaÃ§o DNJ')), 'checkedInAt', v_participation.checked_in_at, 'cooldownEndsAt', v_participation.cooldown_ends_at, 'status', v_participation.status, 'canShareMoment', v_participation.can_share_moment, 'checkInPoints', v_participation.check_in_points));
end;
$$;

revoke all on function public.validate_dnj_qr(uuid, text, uuid, timestamptz) from public;
grant execute on function public.validate_dnj_qr(uuid, text, uuid, timestamptz) to service_role;

with event_row as (select id from public.events where slug = 'dnj-2k26-curitiba'), users_seed as (
  select * from (values
    ('operator:space', 'gestor.espaco@dnj.local', 'Gestor do Palco'),
    ('operator:radicality', 'gestor.radicalidade@dnj.local', 'Gestor Radicalidade'),
    ('operator:special', 'gestor.especial@dnj.local', 'Gestor Eventos Especiais')
  ) as seed(external_key, email, display_name)
)
insert into public.test_users(external_key,email,display_name,role,password_hash)
select external_key,email,display_name,'EVENT_MANAGER',extensions.crypt('dnj2026', extensions.gen_salt('bf')) from users_seed
on conflict (external_key) do update set email=excluded.email,display_name=excluded.display_name,role='EVENT_MANAGER',password_hash=excluded.password_hash,is_active=true;

insert into public.manager_scopes(user_id,scope,space_id)
select u.id,'space_timer',s.id from public.test_users u join public.spaces s on s.slug='palco-principal'
where u.external_key='operator:space'
on conflict do nothing;
insert into public.manager_scopes(user_id,scope)
select id,'radicality' from public.test_users where external_key='operator:radicality'
on conflict do nothing;
insert into public.manager_scopes(user_id,scope)
select id,'special_events' from public.test_users where external_key='operator:special'
on conflict do nothing;

with event_row as (select id from public.events where slug='dnj-2k26-curitiba'), space_row as (select id from public.spaces where slug='espaco-radicalidade')
insert into public.experiences(event_id,space_id,slug,name,description,kind,check_in_points,allows_moment,status)
select event_row.id,space_row.id,seed.slug,seed.name,'Jogo prÃ©-definido da Radicalidade','activity',0,false,'active'
from event_row cross join space_row cross join (values ('radicalidade-corrida-saco','Corrida do saco'),('radicalidade-circuito-inflavel','Circuito inflÃ¡vel'),('radicalidade-desafio-skate','Desafio de skate')) seed(slug,name)
on conflict (event_id,slug) do update set name=excluded.name,status='active';
